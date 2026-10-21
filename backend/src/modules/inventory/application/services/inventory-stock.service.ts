import type { InventoryMovementType, InventoryWastageReason, Prisma } from '@prisma/client';
import { getRawPrismaClient, prisma } from '../../../../shared/database/prisma-client';
import { PRISMA_TRANSACTION_OPTIONS } from '../../../../shared/database/prisma-transaction-options';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { resolveOpenDailySessionId } from '../../../inventory-daily/application/services/inventory-daily-session-resolver';
import { InsufficientInventoryError } from '../../domain/errors/inventory.errors';
import {
  inventoryConsumptionCalculator,
  type ConsumptionLine,
  type OrderLineConsumptionInput,
} from './inventory-consumption-calculator';

type TxClient = Prisma.TransactionClient;

export type OrderDeductionPlan = {
  businessId: string;
  orderId: string;
  consumptions: ConsumptionLine[];
  allowNegative: boolean;
};

export type OrderReversalPlan = {
  businessId: string;
  orderId: string;
  reversals: ConsumptionLine[];
};

function mapOrderLines(
  items: Array<{
    menuItemId: string | null;
    variantId: string | null;
    quantity: number;
    modifiers: Array<{ modifierOptionId: string | null }>;
  }>,
): OrderLineConsumptionInput[] {
  return items.flatMap((item) => {
    if (!item.menuItemId) return [];
    return [{
    menuItemId: item.menuItemId,
    variantId: item.variantId,
    quantity: item.quantity,
    modifierOptionIds: item.modifiers
      .map((m) => m.modifierOptionId)
      .filter((id): id is string => id != null),
  }];
  });
}

export class InventoryStockService {
  async prepareDeduction(businessId: string, orderId: string): Promise<OrderDeductionPlan | null> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: {
        items: { include: { modifiers: true } },
      },
    });
    if (!order) return null;
    if (order.inventoryDeductedAt) return null;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { allowNegativeInventory: true },
    });
    const allowNegative = business?.allowNegativeInventory ?? false;

    const consumptions = await inventoryConsumptionCalculator.calculateForOrderLines(
      businessId,
      mapOrderLines(order.items),
    );

    return { businessId, orderId, consumptions, allowNegative };
  }

  async commitDeduction(
    plan: OrderDeductionPlan,
    actorId: string | undefined,
    tx: TxClient,
  ): Promise<void> {
    const order = await tx.order.findFirst({
      where: { id: plan.orderId, businessId: plan.businessId },
    });
    if (!order || order.inventoryDeductedAt) return;

    if (plan.consumptions.length === 0) {
      await tx.order.update({
        where: { id: plan.orderId },
        data: { inventoryDeductedAt: new Date() },
      });
      return;
    }

    const dailySessionId = await resolveOpenDailySessionId(plan.businessId);

    await this.applyConsumption(
      plan.businessId,
      plan.consumptions,
      'SALE',
      plan.orderId,
      actorId,
      plan.allowNegative,
      tx,
      dailySessionId,
    );

    await tx.order.update({
      where: { id: plan.orderId },
      data: { inventoryDeductedAt: new Date() },
    });
  }

  async deductForOrder(
    businessId: string,
    orderId: string,
    actorId?: string,
    tx?: TxClient,
  ): Promise<void> {
    const plan = await this.prepareDeduction(businessId, orderId);
    if (!plan) return;

    if (tx) {
      await this.commitDeduction(plan, actorId, tx);
    } else {
      await getRawPrismaClient().$transaction(async (innerTx) => {
        await this.commitDeduction(plan, actorId, innerTx);
      }, PRISMA_TRANSACTION_OPTIONS);
    }

    emitDomainEvent('inventory.stock_changed', { businessId, orderId });
  }

  async prepareReversal(businessId: string, orderId: string): Promise<OrderReversalPlan | null> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: {
        items: { include: { modifiers: true } },
      },
    });
    if (!order) return null;
    if (!order.inventoryDeductedAt) return null;
    if (order.inventoryReversedAt) return null;

    const consumptions = await inventoryConsumptionCalculator.calculateForOrderLines(
      businessId,
      mapOrderLines(order.items),
    );

    const reversals = consumptions.map((c) => ({
      inventoryItemId: c.inventoryItemId,
      quantityDelta: -c.quantityDelta,
    }));

    return { businessId, orderId, reversals };
  }

  async commitReversal(
    plan: OrderReversalPlan,
    actorId: string | undefined,
    tx: TxClient,
  ): Promise<void> {
    const order = await tx.order.findFirst({
      where: { id: plan.orderId, businessId: plan.businessId },
    });
    if (!order || !order.inventoryDeductedAt || order.inventoryReversedAt) return;

    if (plan.reversals.length > 0) {
      const dailySessionId = await resolveOpenDailySessionId(plan.businessId);
      await this.applyConsumption(
        plan.businessId,
        plan.reversals,
        'SALE_REVERSAL',
        plan.orderId,
        actorId,
        true,
        tx,
        dailySessionId,
      );
    }

    await tx.order.update({
      where: { id: plan.orderId },
      data: { inventoryReversedAt: new Date() },
    });
  }

  async reverseForOrder(
    businessId: string,
    orderId: string,
    actorId?: string,
    tx?: TxClient,
  ): Promise<void> {
    const plan = await this.prepareReversal(businessId, orderId);
    if (!plan) return;

    if (tx) {
      await this.commitReversal(plan, actorId, tx);
    } else {
      await getRawPrismaClient().$transaction(async (innerTx) => {
        await this.commitReversal(plan, actorId, innerTx);
      }, PRISMA_TRANSACTION_OPTIONS);
    }

    emitDomainEvent('inventory.stock_changed', { businessId, orderId });
  }

  async validateOrderLinesAvailable(
    businessId: string,
    lines: OrderLineConsumptionInput[],
  ): Promise<void> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { allowNegativeInventory: true },
    });
    if (business?.allowNegativeInventory) return;

    const consumptions = await inventoryConsumptionCalculator.calculateForOrderLines(
      businessId,
      lines,
    );
    if (consumptions.length === 0) return;

    const itemIds = [...new Set(consumptions.map((c) => c.inventoryItemId))];
    const items = await prisma.inventoryItem.findMany({
      where: { businessId, id: { in: itemIds } },
    });
    const stockMap = new Map(items.map((i) => [i.id, Number(i.currentQuantity)]));
    const nameMap = new Map(items.map((i) => [i.id, i.name]));

    const shortages: Array<{
      inventoryItemId: string;
      name: string;
      required: string;
      available: string;
    }> = [];

    for (const c of consumptions) {
      const available = stockMap.get(c.inventoryItemId) ?? 0;
      if (c.quantityDelta > available) {
        shortages.push({
          inventoryItemId: c.inventoryItemId,
          name: nameMap.get(c.inventoryItemId) ?? 'Unknown',
          required: String(c.quantityDelta),
          available: String(available),
        });
      }
    }

    if (shortages.length > 0) {
      throw new InsufficientInventoryError('Insufficient inventory for this order', shortages);
    }
  }

  private async applyConsumption(
    businessId: string,
    consumptions: ConsumptionLine[],
    movementType: InventoryMovementType,
    orderId: string,
    actorId: string | undefined,
    allowNegative: boolean,
    client: TxClient,
    dailySessionId?: string | null,
  ) {
    const itemIds = [...new Set(consumptions.map((c) => c.inventoryItemId))];
    const items = await client.inventoryItem.findMany({
      where: { businessId, id: { in: itemIds } },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const shortages: Array<{
      inventoryItemId: string;
      name: string;
      required: string;
      available: string;
    }> = [];

    for (const c of consumptions) {
      const item = itemMap.get(c.inventoryItemId);
      if (!item) continue;

      const current = Number(item.currentQuantity);
      const delta = c.quantityDelta;

      if (!allowNegative && delta > 0 && current < delta) {
        shortages.push({
          inventoryItemId: c.inventoryItemId,
          name: item.name,
          required: String(delta),
          available: String(current),
        });
      }
    }

    if (shortages.length > 0) {
      throw new InsufficientInventoryError('Insufficient inventory to complete this order', shortages);
    }

    for (const c of consumptions) {
      const item = itemMap.get(c.inventoryItemId);
      if (!item) continue;

      const current = Number(item.currentQuantity);
      const delta = c.quantityDelta;

      if (delta > 0) {
        const updated = await client.inventoryItem.updateMany({
          where: {
            id: c.inventoryItemId,
            businessId,
            ...(allowNegative ? {} : { currentQuantity: { gte: delta } }),
          },
          data: { currentQuantity: { decrement: delta } },
        });

        if (updated.count === 0) {
          shortages.push({
            inventoryItemId: c.inventoryItemId,
            name: item.name,
            required: String(delta),
            available: String(current),
          });
          continue;
        }
      } else if (delta < 0) {
        await client.inventoryItem.updateMany({
          where: { id: c.inventoryItemId, businessId },
          data: { currentQuantity: { increment: -delta } },
        });
      }

      const quantityAfter = current - delta;

      await client.inventoryMovement.create({
        data: {
          businessId,
          inventoryItemId: c.inventoryItemId,
          type: movementType,
          quantityDelta: -delta,
          quantityAfter,
          orderId,
          dailySessionId: dailySessionId ?? null,
          createdById: actorId,
        },
      });
    }

    if (shortages.length > 0) {
      throw new InsufficientInventoryError('Insufficient inventory to complete this order', shortages);
    }
  }

  async adjustStock(
    businessId: string,
    inventoryItemId: string,
    quantityDelta: number,
    type: InventoryMovementType,
    actorId: string,
    note?: string,
    options?: {
      wastageReason?: InventoryWastageReason;
      unitCost?: number;
      dailySessionId?: string | null;
    },
  ) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, businessId },
    });
    if (!item) throw new Error('Inventory item not found');

    const dailySessionId =
      options?.dailySessionId !== undefined
        ? options.dailySessionId
        : await resolveOpenDailySessionId(businessId);

    const newQty = Number(item.currentQuantity) + quantityDelta;

    const updated = await getRawPrismaClient().$transaction(async (tx) => {
      const row = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { currentQuantity: newQty },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId,
          inventoryItemId,
          type,
          quantityDelta,
          quantityAfter: Number(row.currentQuantity),
          note,
          createdById: actorId,
          dailySessionId: dailySessionId ?? null,
          wastageReason: options?.wastageReason ?? null,
          unitCost: options?.unitCost ?? null,
        },
      });

      return row;
    }, PRISMA_TRANSACTION_OPTIONS);

    emitDomainEvent('inventory.stock_changed', { businessId, inventoryItemId });
    return updated;
  }
}

export const inventoryStockService = new InventoryStockService();
