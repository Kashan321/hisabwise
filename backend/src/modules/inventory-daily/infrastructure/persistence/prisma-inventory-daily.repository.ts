import type {
  InventoryDailySessionStatus,
  InventoryMovementType,
  InventoryWastageReason,
  Prisma,
} from '@prisma/client';
import { getRawPrismaClient, prisma } from '../../../../shared/database/prisma-client';
import { PRISMA_TRANSACTION_OPTIONS } from '../../../../shared/database/prisma-transaction-options';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import {
  InventoryDailySessionAlreadyOpenError,
  InventoryDailySessionClosedError,
  InventoryDailySessionNotFoundError,
} from '../../domain/errors/inventory-daily.errors';

function dec(value: Prisma.Decimal | number | string): number {
  return Number(value);
}

function decStr(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function mapSession(session: {
  id: string;
  sessionDate: Date;
  shiftName: string | null;
  status: InventoryDailySessionStatus;
  openedAt: Date;
  closedAt: Date | null;
  openingNotes: string | null;
  closingNotes: string | null;
  openedBy: { id: string; name: string };
  closedBy: { id: string; name: string } | null;
}) {
  return {
    id: session.id,
    sessionDate: session.sessionDate.toISOString().slice(0, 10),
    shiftName: session.shiftName,
    status: session.status,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    openingNotes: session.openingNotes,
    closingNotes: session.closingNotes,
    openedById: session.openedBy.id,
    openedByName: session.openedBy.name,
    closedById: session.closedBy?.id ?? null,
    closedByName: session.closedBy?.name ?? null,
  };
}

export type ItemActivitySummary = {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  openingQuantity: string;
  purchased: string;
  salesConsumption: string;
  wastage: string;
  adjustments: string;
  saleReversals: string;
  expectedClosing: string;
  actualClosing: string | null;
  variance: string | null;
  currentStock: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
};

export class PrismaInventoryDailyRepository {
  async findOpenSession(businessId: string) {
    const session = await prisma.inventoryDailySession.findFirst({
      where: { businessId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    return session ? mapSession(session) : null;
  }

  async listSessions(businessId: string, limit = 30) {
    const sessions = await prisma.inventoryDailySession.findMany({
      where: { businessId },
      orderBy: { openedAt: 'desc' },
      take: limit,
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    return sessions.map(mapSession);
  }

  async getSession(businessId: string, sessionId: string) {
    const session = await prisma.inventoryDailySession.findFirst({
      where: { id: sessionId, businessId },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    if (!session) throw new InventoryDailySessionNotFoundError();
    return mapSession(session);
  }

  async openSession(
    businessId: string,
    userId: string,
    input: { sessionDate?: string; shiftName?: string; openingNotes?: string },
  ) {
    const existing = await prisma.inventoryDailySession.findFirst({
      where: { businessId, status: 'OPEN' },
    });
    if (existing) throw new InventoryDailySessionAlreadyOpenError();

    const sessionDate = input.sessionDate
      ? toDateOnly(new Date(input.sessionDate))
      : toDateOnly(new Date());

    const items = await prisma.inventoryItem.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryDailySession.create({
        data: {
          businessId,
          sessionDate,
          shiftName: input.shiftName?.trim() || null,
          openingNotes: input.openingNotes?.trim() || null,
          openedById: userId,
        },
        include: {
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
        },
      });

      if (items.length > 0) {
        await tx.inventoryDailyLine.createMany({
          data: items.map((item) => ({
            sessionId: created.id,
            inventoryItemId: item.id,
            openingQuantity: item.currentQuantity,
          })),
        });
      }

      return created;
    }, PRISMA_TRANSACTION_OPTIONS);

    return mapSession(session);
  }

  private stockStatus(
    current: number,
    minThreshold: number | null,
  ): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (current <= 0) return 'out_of_stock';
    if (minThreshold != null && current <= minThreshold) return 'low_stock';
    return 'in_stock';
  }

  private avgUnitCostFromPurchases(
    purchases: { inventoryItemId: string; unitCost: Prisma.Decimal | null }[],
    inventoryItemId: string,
  ): number {
    const costs = purchases.filter((p) => p.inventoryItemId === inventoryItemId && p.unitCost);
    if (!costs.length) return 0;
    return costs.reduce((s, p) => s + dec(p.unitCost!), 0) / costs.length;
  }

  private async ensureDailyLine(
    tx: Prisma.TransactionClient,
    sessionId: string,
    inventoryItemId: string,
    openingQuantity: number,
  ) {
    const existing = await tx.inventoryDailyLine.findUnique({
      where: { sessionId_inventoryItemId: { sessionId, inventoryItemId } },
    });
    if (existing) return existing;
    return tx.inventoryDailyLine.create({
      data: { sessionId, inventoryItemId, openingQuantity },
    });
  }

  private buildActivitySummary(
    item: {
      id: string;
      name: string;
      unit: string;
      currentQuantity: Prisma.Decimal;
      minThreshold: Prisma.Decimal | null;
    },
    line: {
      openingQuantity: Prisma.Decimal;
      actualClosingQuantity: Prisma.Decimal | null;
      variance: Prisma.Decimal | null;
    } | null,
    activity: {
      purchased: number;
      sales: number;
      wastage: number;
      adjustments: number;
      reversals: number;
    },
    movementSum: number,
  ): ItemActivitySummary {
    const opening = line ? dec(line.openingQuantity) : dec(item.currentQuantity) - movementSum;
    const expected =
      opening +
      activity.purchased +
      activity.reversals +
      activity.adjustments -
      activity.sales -
      activity.wastage;
    const actual = line?.actualClosingQuantity != null ? dec(line.actualClosingQuantity) : null;
    const variance =
      actual != null && line?.variance != null
        ? dec(line.variance)
        : actual != null
          ? actual - expected
          : null;
    const current = dec(item.currentQuantity);

    return {
      inventoryItemId: item.id,
      itemName: item.name,
      unit: item.unit,
      openingQuantity: decStr(opening),
      purchased: decStr(activity.purchased),
      salesConsumption: decStr(activity.sales),
      wastage: decStr(activity.wastage),
      adjustments: decStr(activity.adjustments + activity.reversals),
      saleReversals: decStr(activity.reversals),
      expectedClosing: decStr(expected),
      actualClosing: actual != null ? decStr(actual) : null,
      variance: variance != null ? decStr(variance) : null,
      currentStock: decStr(current),
      stockStatus: this.stockStatus(current, item.minThreshold != null ? dec(item.minThreshold) : null),
    };
  }

  async computeItemSummaries(businessId: string, sessionId: string): Promise<ItemActivitySummary[]> {
    const session = await prisma.inventoryDailySession.findFirst({
      where: { id: sessionId, businessId },
      include: {
        lines: true,
      },
    });
    if (!session) throw new InventoryDailySessionNotFoundError();

    const allItems = await prisma.inventoryItem.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const movements = await prisma.inventoryMovement.findMany({
      where: { dailySessionId: sessionId },
      select: { inventoryItemId: true, type: true, quantityDelta: true },
    });

    const byItem = new Map<
      string,
      { purchased: number; sales: number; wastage: number; adjustments: number; reversals: number }
    >();
    const movementSumByItem = new Map<string, number>();

    for (const m of movements) {
      const bucket = byItem.get(m.inventoryItemId) ?? {
        purchased: 0,
        sales: 0,
        wastage: 0,
        adjustments: 0,
        reversals: 0,
      };
      const delta = dec(m.quantityDelta);
      movementSumByItem.set(
        m.inventoryItemId,
        (movementSumByItem.get(m.inventoryItemId) ?? 0) + delta,
      );
      switch (m.type) {
        case 'RECEIPT':
          bucket.purchased += delta;
          break;
        case 'SALE':
          bucket.sales += -delta;
          break;
        case 'SALE_REVERSAL':
          bucket.reversals += delta;
          break;
        case 'WASTE':
          bucket.wastage += -delta;
          break;
        case 'ADJUSTMENT':
        case 'INITIAL':
          bucket.adjustments += delta;
          break;
      }
      byItem.set(m.inventoryItemId, bucket);
    }

    const lineMap = new Map(session.lines.map((line) => [line.inventoryItemId, line]));

    return allItems.map((item) => {
      const activity = byItem.get(item.id) ?? {
        purchased: 0,
        sales: 0,
        wastage: 0,
        adjustments: 0,
        reversals: 0,
      };
      return this.buildActivitySummary(
        item,
        lineMap.get(item.id) ?? null,
        activity,
        movementSumByItem.get(item.id) ?? 0,
      );
    });
  }

  async getSessionSummary(businessId: string, sessionId: string) {
    const session = await this.getSession(businessId, sessionId);
    const items = await this.computeItemSummaries(businessId, sessionId);

    const purchases = await prisma.inventoryPurchase.findMany({
      where: { sessionId, businessId },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    const totalPurchasesValue = purchases.reduce((sum, p) => sum + (p.totalCost ? dec(p.totalCost) : 0), 0);

    let totalWastageValue = 0;
    let salesConsumptionValue = 0;
    for (const item of items) {
      const wastageQty = dec(item.wastage);
      if (wastageQty > 0) {
        totalWastageValue += wastageQty * this.avgUnitCostFromPurchases(purchases, item.inventoryItemId);
      }
      const salesQty = dec(item.salesConsumption);
      if (salesQty > 0) {
        salesConsumptionValue += salesQty * this.avgUnitCostFromPurchases(purchases, item.inventoryItemId);
      }
    }
    const totalInventoryOutflow = salesConsumptionValue + totalWastageValue;

    const openingStockValue = items.reduce(
      (sum, item) =>
        sum + dec(item.openingQuantity) * this.avgUnitCostFromPurchases(purchases, item.inventoryItemId),
      0,
    );

    const closingStockValue = items.reduce((sum, item) => {
      const qty = item.actualClosing != null ? dec(item.actualClosing) : dec(item.expectedClosing);
      return sum + qty * this.avgUnitCostFromPurchases(purchases, item.inventoryItemId);
    }, 0);

    const varianceValue = items.reduce((sum, item) => {
      if (!item.variance) return sum;
      return sum + dec(item.variance) * this.avgUnitCostFromPurchases(purchases, item.inventoryItemId);
    }, 0);

    const sessionRow = await prisma.inventoryDailySession.findFirst({
      where: { id: sessionId, businessId },
      select: { openedAt: true, closedAt: true },
    });
    const periodEnd = sessionRow?.closedAt ?? new Date();
    const completedOrders = sessionRow
      ? await prisma.order.findMany({
          where: {
            businessId,
            status: 'COMPLETED',
            isDraft: false,
            updatedAt: { gte: sessionRow.openedAt, lte: periodEnd },
          },
          select: { totalAmount: true },
        })
      : [];
    const totalSalesRevenue = completedOrders.reduce((s, o) => s + dec(o.totalAmount), 0);
    const completedOrderCount = completedOrders.length;

    const lowStock = items.filter((i) => i.stockStatus === 'low_stock');
    const outOfStock = items.filter((i) => i.stockStatus === 'out_of_stock');
    const highVariance = items.filter((i) => i.variance != null && Math.abs(dec(i.variance)) > 0.001);

    const totals = items.reduce(
      (acc, item) => ({
        purchased: acc.purchased + dec(item.purchased),
        salesConsumption: acc.salesConsumption + dec(item.salesConsumption),
        wastage: acc.wastage + dec(item.wastage),
        adjustments: acc.adjustments + dec(item.adjustments),
      }),
      { purchased: 0, salesConsumption: 0, wastage: 0, adjustments: 0 },
    );

    const openingTotal = items.reduce((s, i) => s + dec(i.openingQuantity), 0);
    const expectedTotal = items.reduce((s, i) => s + dec(i.expectedClosing), 0);
    const actualTotal = items.reduce(
      (s, i) => s + (i.actualClosing != null ? dec(i.actualClosing) : dec(i.expectedClosing)),
      0,
    );

    return {
      session,
      items,
      purchases: purchases.map((p) => ({
        id: p.id,
        inventoryItemId: p.inventoryItemId,
        itemName: p.inventoryItem.name,
        unit: p.inventoryItem.unit,
        quantity: decStr(dec(p.quantity)),
        unitCost: p.unitCost ? decStr(dec(p.unitCost)) : null,
        totalCost: p.totalCost ? decStr(dec(p.totalCost)) : null,
        supplier: p.supplier,
        invoiceRef: p.invoiceRef,
        notes: p.notes,
        purchasedAt: p.purchasedAt,
        createdByName: p.createdBy.name,
      })),
      totals: {
        openingQuantity: decStr(openingTotal),
        purchased: decStr(totals.purchased),
        salesConsumption: decStr(totals.salesConsumption),
        wastage: decStr(totals.wastage),
        adjustments: decStr(totals.adjustments),
        expectedClosing: decStr(expectedTotal),
        actualClosing: decStr(actualTotal),
        openingStockValue: decStr(openingStockValue),
        totalPurchasesValue: decStr(totalPurchasesValue),
        totalWastageValue: decStr(totalWastageValue),
        salesConsumptionValue: decStr(salesConsumptionValue),
        totalInventoryOutflow: decStr(totalInventoryOutflow),
        totalSalesRevenue: decStr(totalSalesRevenue),
        completedOrderCount: String(completedOrderCount),
        closingStockValue: decStr(closingStockValue),
        varianceValue: decStr(varianceValue),
      },
      alerts: {
        lowStock,
        outOfStock,
        highVariance,
      },
    };
  }

  async closeSession(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      lines: Array<{ inventoryItemId: string; actualClosingQuantity: number }>;
      closingNotes?: string;
    },
  ) {
    const session = await prisma.inventoryDailySession.findFirst({
      where: { id: sessionId, businessId },
    });
    if (!session) throw new InventoryDailySessionNotFoundError();
    if (session.status === 'CLOSED') throw new InventoryDailySessionClosedError();

    const summaries = await this.computeItemSummaries(businessId, sessionId);
    const summaryMap = new Map(summaries.map((s) => [s.inventoryItemId, s]));

    await getRawPrismaClient().$transaction(async (tx) => {
      for (const line of input.lines) {
        const summary = summaryMap.get(line.inventoryItemId);
        if (!summary) continue;
        const expected = dec(summary.expectedClosing);
        const actual = line.actualClosingQuantity;
        const variance = actual - expected;

        await tx.inventoryDailyLine.updateMany({
          where: { sessionId, inventoryItemId: line.inventoryItemId },
          data: {
            expectedClosingQuantity: expected,
            actualClosingQuantity: actual,
            variance,
          },
        });
      }

      // Update lines not in input with expected only
      for (const summary of summaries) {
        const provided = input.lines.find((l) => l.inventoryItemId === summary.inventoryItemId);
        if (provided) continue;
        await tx.inventoryDailyLine.updateMany({
          where: { sessionId, inventoryItemId: summary.inventoryItemId },
          data: {
            expectedClosingQuantity: dec(summary.expectedClosing),
            actualClosingQuantity: dec(summary.expectedClosing),
            variance: 0,
          },
        });
      }

      await tx.inventoryDailySession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          closedById: userId,
          closedAt: new Date(),
          closingNotes: input.closingNotes?.trim() || null,
        },
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    const closedSession = await this.getSession(businessId, sessionId);
    const summary = await this.getSessionSummary(businessId, sessionId);
    return { session: closedSession, summary };
  }

  async recordPurchase(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      inventoryItemId: string;
      quantity: number;
      unitCost?: number;
      supplier?: string;
      supplierId?: string;
      invoiceRef?: string;
      notes?: string;
      purchasedAt?: string;
    },
  ) {
    const session = await prisma.inventoryDailySession.findFirst({
      where: { id: sessionId, businessId },
    });
    if (!session) throw new InventoryDailySessionNotFoundError();
    if (session.status !== 'OPEN') throw new InventoryDailySessionClosedError();

    const item = await prisma.inventoryItem.findFirst({
      where: { id: input.inventoryItemId, businessId },
    });
    if (!item) throw new Error('Inventory item not found');

    let supplierId: string | null = input.supplierId ?? null;
    let supplierName = input.supplier?.trim() || null;
    if (supplierId) {
      const supplierRow = await prisma.supplier.findFirst({
        where: { id: supplierId, businessId, isActive: true },
      });
      if (!supplierRow) throw new Error('Supplier not found');
      supplierName = supplierRow.name;
    } else {
      supplierId = null;
    }

    const totalCost =
      input.unitCost != null ? Math.round(input.quantity * input.unitCost * 100) / 100 : null;

    const result = await getRawPrismaClient().$transaction(async (tx) => {
      const current = dec(item.currentQuantity);
      const newQty = current + input.quantity;
      const openBusinessDay = await tx.businessDay.findFirst({
        where: { businessId, status: 'OPEN' },
        select: { id: true },
      });

      await this.ensureDailyLine(tx, sessionId, input.inventoryItemId, current);

      const row = await tx.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { currentQuantity: newQty },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          businessId,
          businessDayId: openBusinessDay?.id ?? null,
          inventoryItemId: input.inventoryItemId,
          type: 'RECEIPT',
          quantityDelta: input.quantity,
          quantityAfter: dec(row.currentQuantity),
          dailySessionId: sessionId,
          unitCost: input.unitCost ?? null,
          note: input.notes?.trim() || `Purchase${supplierName ? ` from ${supplierName}` : ''}`,
          createdById: userId,
        },
      });

      const purchase = await tx.inventoryPurchase.create({
        data: {
          businessId,
          businessDayId: openBusinessDay?.id ?? null,
          sessionId,
          inventoryItemId: input.inventoryItemId,
          movementId: movement.id,
          quantity: input.quantity,
          unitCost: input.unitCost ?? null,
          totalCost,
          supplier: supplierName,
          supplierId,
          invoiceRef: input.invoiceRef?.trim() || null,
          notes: input.notes?.trim() || null,
          purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : new Date(),
          createdById: userId,
        },
        include: {
          inventoryItem: { select: { name: true, unit: true } },
          createdBy: { select: { name: true } },
        },
      });

      return purchase;
    }, PRISMA_TRANSACTION_OPTIONS);

    emitDomainEvent('inventory.stock_changed', {
      businessId,
      inventoryItemId: input.inventoryItemId,
    });

    return {
      id: result.id,
      inventoryItemId: result.inventoryItemId,
      itemName: result.inventoryItem.name,
      unit: result.inventoryItem.unit,
      quantity: decStr(dec(result.quantity)),
      unitCost: result.unitCost ? decStr(dec(result.unitCost)) : null,
      totalCost: result.totalCost ? decStr(dec(result.totalCost)) : null,
      supplier: result.supplier,
      supplierId: result.supplierId,
      invoiceRef: result.invoiceRef,
      notes: result.notes,
      purchasedAt: result.purchasedAt,
      createdByName: result.createdBy.name,
    };
  }

  async recordWastage(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      inventoryItemId: string;
      quantity: number;
      reason: InventoryWastageReason;
      notes?: string;
    },
  ) {
    return this.recordAdjustment(businessId, sessionId, userId, {
      inventoryItemId: input.inventoryItemId,
      quantityDelta: -input.quantity,
      type: 'WASTE',
      wastageReason: input.reason,
      note: input.notes?.trim() || input.reason,
    });
  }

  async recordAdjustment(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      inventoryItemId: string;
      quantityDelta: number;
      type?: InventoryMovementType;
      wastageReason?: InventoryWastageReason;
      note?: string;
    },
  ) {
    const session = await prisma.inventoryDailySession.findFirst({
      where: { id: sessionId, businessId },
    });
    if (!session) throw new InventoryDailySessionNotFoundError();
    if (session.status !== 'OPEN') throw new InventoryDailySessionClosedError();

    const item = await prisma.inventoryItem.findFirst({
      where: { id: input.inventoryItemId, businessId },
    });
    if (!item) throw new Error('Inventory item not found');

    const movementType = input.type ?? 'ADJUSTMENT';
    const newQty = dec(item.currentQuantity) + input.quantityDelta;

    const actor = await prisma.user.findFirst({
      where: { id: userId, businessId },
      select: { name: true },
    });

    const movement = await getRawPrismaClient().$transaction(async (tx) => {
      const stockBefore = dec(item.currentQuantity);
      const openBusinessDay = await tx.businessDay.findFirst({
        where: { businessId, status: 'OPEN' },
        select: { id: true },
      });

      await this.ensureDailyLine(tx, sessionId, input.inventoryItemId, stockBefore);

      const row = await tx.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { currentQuantity: newQty },
      });

      return tx.inventoryMovement.create({
        data: {
          businessId,
          businessDayId: openBusinessDay?.id ?? null,
          inventoryItemId: input.inventoryItemId,
          type: movementType,
          quantityDelta: input.quantityDelta,
          quantityAfter: dec(row.currentQuantity),
          dailySessionId: sessionId,
          wastageReason: input.wastageReason ?? null,
          note: input.note ?? null,
          createdById: userId,
        },
        include: {
          inventoryItem: { select: { name: true, unit: true } },
        },
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    emitDomainEvent('inventory.stock_changed', {
      businessId,
      inventoryItemId: input.inventoryItemId,
    });

    return {
      id: movement.id,
      inventoryItemId: movement.inventoryItemId,
      itemName: movement.inventoryItem.name,
      unit: movement.inventoryItem.unit,
      type: movement.type,
      quantityDelta: decStr(dec(movement.quantityDelta)),
      quantityAfter: decStr(dec(movement.quantityAfter)),
      wastageReason: movement.wastageReason,
      note: movement.note,
      createdByName: actor?.name ?? '—',
      createdAt: movement.createdAt,
    };
  }

  async listSessionMovements(businessId: string, sessionId: string, limit = 100) {
    const session = await prisma.inventoryDailySession.findFirst({
      where: { id: sessionId, businessId },
    });
    if (!session) throw new InventoryDailySessionNotFoundError();

    const movements = await prisma.inventoryMovement.findMany({
      where: { dailySessionId: sessionId },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = movements.map((m) => m.createdById).filter((id): id is string => id != null);
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { businessId, id: { in: [...new Set(userIds)] } },
            select: { id: true, name: true },
          })
        : [];
    const userNameById = new Map(users.map((u) => [u.id, u.name]));

    return movements.map((m) => ({
      id: m.id,
      inventoryItemId: m.inventoryItemId,
      itemName: m.inventoryItem.name,
      unit: m.inventoryItem.unit,
      type: m.type,
      quantityDelta: decStr(dec(m.quantityDelta)),
      quantityBefore: decStr(dec(m.quantityAfter) - dec(m.quantityDelta)),
      quantityAfter: decStr(dec(m.quantityAfter)),
      orderId: m.orderId,
      wastageReason: m.wastageReason,
      unitCost: m.unitCost ? decStr(dec(m.unitCost)) : null,
      note: m.note,
      createdByName: (m.createdById ? userNameById.get(m.createdById) : null) ?? 'System',
      createdAt: m.createdAt,
    }));
  }
}
