import type { CashDrawerMovementType, CashShiftStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import { BusinessDayNotOpenError } from '../../../business-day/domain/errors/business-day.errors';
import {
  CashShiftAlreadyOpenError,
  CashShiftClosedError,
  CashShiftNotFoundError,
} from '../../domain/errors/cash-shift.errors';

function decimalToString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function mapMovement(movement: {
  id: string;
  type: CashDrawerMovementType;
  amount: Prisma.Decimal;
  reason: string | null;
  orderId: string | null;
  createdById: string;
  createdAt: Date;
  createdBy: { name: string } | null;
}) {
  return {
    id: movement.id,
    type: movement.type,
    amount: decimalToString(movement.amount),
    reason: movement.reason,
    orderId: movement.orderId,
    createdById: movement.createdById,
    createdByName: movement.createdBy?.name ?? '—',
    createdAt: movement.createdAt,
  };
}

function mapShift(shift: {
  id: string;
  status: CashShiftStatus;
  openingCash: Prisma.Decimal;
  expectedCash: Prisma.Decimal | null;
  actualCash: Prisma.Decimal | null;
  variance: Prisma.Decimal | null;
  notes: string | null;
  closingSettlement?: string | null;
  transferredCash?: Prisma.Decimal | null;
  destinationAccountId?: string | null;
  destinationAccount?: { id: string; name: string; accountType: string } | null;
  openedAt: Date;
  closedAt: Date | null;
  openedBy: { id: string; name: string };
  closedBy: { id: string; name: string } | null;
  movements?: Array<Parameters<typeof mapMovement>[0]>;
}) {
  return {
    id: shift.id,
    status: shift.status,
    openingCash: decimalToString(shift.openingCash),
    expectedCash: shift.expectedCash ? decimalToString(shift.expectedCash) : null,
    actualCash: shift.actualCash ? decimalToString(shift.actualCash) : null,
    variance: shift.variance ? decimalToString(shift.variance) : null,
    notes: shift.notes,
    closingSettlement: shift.closingSettlement ?? null,
    transferredCash: shift.transferredCash ? decimalToString(shift.transferredCash) : null,
    destinationAccountId: shift.destinationAccountId ?? null,
    destinationAccountName: shift.destinationAccount?.name ?? null,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt,
    openedById: shift.openedBy.id,
    openedByName: shift.openedBy.name,
    closedById: shift.closedBy?.id ?? null,
    closedByName: shift.closedBy?.name ?? null,
    movements: shift.movements?.map(mapMovement),
  };
}

export class PrismaCashShiftRepository {
  async findOpenShift(businessId: string) {
    const shift = await prisma.cashShift.findFirst({
      where: { businessId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        destinationAccount: { select: { id: true, name: true, accountType: true } },
      },
    });
    return shift ? mapShift(shift) : null;
  }

  async getById(businessId: string, shiftId: string, includeMovements = false) {
    const baseInclude = {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
      destinationAccount: { select: { id: true, name: true, accountType: true } },
    } as const;

    const shift = includeMovements
      ? await prisma.cashShift.findFirst({
          where: { id: shiftId, businessId },
          include: {
            ...baseInclude,
            movements: {
              include: { createdBy: { select: { name: true } } },
              orderBy: { createdAt: 'desc' as const },
            },
          },
        })
      : await prisma.cashShift.findFirst({
          where: { id: shiftId, businessId },
          include: baseInclude,
        });

    if (!shift) throw new CashShiftNotFoundError();
    return mapShift(shift);
  }

  async openShift(businessId: string, openedById: string, openingCash: number) {
    const existing = await prisma.cashShift.findFirst({
      where: { businessId, status: 'OPEN' },
    });
    if (existing) throw new CashShiftAlreadyOpenError();

    const shift = await prisma.$transaction(async (tx) => {
      const openBusinessDay = await tx.businessDay.findFirst({
        where: { businessId, status: 'OPEN' },
        orderBy: { startedAt: 'desc' },
      });
      if (!openBusinessDay) throw new BusinessDayNotOpenError();

      const created = await tx.cashShift.create({
        data: {
          businessId,
          businessDayId: openBusinessDay.id,
          openedById,
          openingCash,
        },
        include: {
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
        },
      });

      await tx.cashDrawerMovement.create({
        data: {
          businessId,
          cashShiftId: created.id,
          type: 'OPENING',
          amount: openingCash,
          reason: 'Opening float',
          createdById: openedById,
        },
      });

      return created;
    });

    return mapShift(shift);
  }

  async computeExpectedCash(cashShiftId: string): Promise<number> {
    const movements = await prisma.cashDrawerMovement.findMany({
      where: { cashShiftId },
    });

    let total = 0;
    for (const m of movements) {
      const amount = Number(m.amount);
      switch (m.type) {
        case 'OPENING':
        case 'SALE':
        case 'PAY_IN':
          total += amount;
          break;
        case 'REFUND':
        case 'PAY_OUT':
          total -= amount;
          break;
        case 'CLOSING':
          break;
      }
    }
    return Math.round(total * 100) / 100;
  }

  async closeShift(
    businessId: string,
    shiftId: string,
    closedById: string,
    input: {
      actualCash: number;
      notes?: string;
      closingSettlement: string;
      transferredCash?: number;
      destinationAccountId?: string | null;
    },
  ) {
    const { actualCash, notes, closingSettlement, transferredCash, destinationAccountId } = input;
    const shift = await prisma.cashShift.findFirst({ where: { id: shiftId, businessId } });
    if (!shift) throw new CashShiftNotFoundError();
    if (shift.status === 'CLOSED') throw new CashShiftClosedError();

    const expectedCash = await this.computeExpectedCash(shiftId);
    const variance = Math.round((actualCash - expectedCash) * 100) / 100;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.cashShift.update({
        where: { id: shiftId },
        data: {
          status: 'CLOSED',
          closedById,
          closedAt: new Date(),
          expectedCash,
          actualCash,
          variance,
          notes: notes ?? null,
          closingSettlement: closingSettlement as never,
          transferredCash: transferredCash ?? null,
          destinationAccountId: destinationAccountId ?? null,
        },
        include: {
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
          destinationAccount: { select: { id: true, name: true, accountType: true } },
        },
      });

      await tx.cashDrawerMovement.create({
        data: {
          businessId,
          cashShiftId: shiftId,
          type: 'CLOSING',
          amount: actualCash,
          reason: notes ? `Closing count · ${notes}` : 'Closing count',
          createdById: closedById,
        },
      });

      return row;
    });

    return mapShift(updated);
  }

  async addMovement(
    businessId: string,
    shiftId: string,
    type: 'PAY_IN' | 'PAY_OUT',
    amount: number,
    reason: string,
    createdById: string,
  ) {
    const shift = await prisma.cashShift.findFirst({ where: { id: shiftId, businessId } });
    if (!shift) throw new CashShiftNotFoundError();
    if (shift.status !== 'OPEN') throw new CashShiftClosedError();

    const movement = await prisma.cashDrawerMovement.create({
      data: {
        businessId,
        cashShiftId: shiftId,
        type,
        amount,
        reason,
        createdById,
      },
      include: { createdBy: { select: { name: true } } },
    });

    return mapMovement(movement);
  }

  async recordCashSale(
    tx: Prisma.TransactionClient,
    businessId: string,
    cashShiftId: string,
    orderId: string,
    amount: number,
    createdById: string,
    reason = 'Cash sale',
  ) {
    await tx.cashDrawerMovement.create({
      data: {
        businessId,
        cashShiftId,
        type: 'SALE',
        amount,
        reason,
        orderId,
        createdById,
      },
    });
  }

  async recordCashRefund(
    tx: Prisma.TransactionClient,
    businessId: string,
    cashShiftId: string,
    orderId: string,
    amount: number,
    createdById: string,
    reason = 'Cash refund',
  ) {
    await tx.cashDrawerMovement.create({
      data: {
        businessId,
        cashShiftId,
        type: 'REFUND',
        amount,
        reason,
        orderId,
        createdById,
      },
    });
  }

  private summarizeMovements(
    movements: Array<{ type: CashDrawerMovementType; amount: Prisma.Decimal }>,
  ) {
    let openingCash = 0;
    let cashSales = 0;
    let cashRefunds = 0;
    let payIn = 0;
    let payOut = 0;

    for (const m of movements) {
      const amount = Number(m.amount);
      switch (m.type) {
        case 'OPENING':
          openingCash += amount;
          break;
        case 'SALE':
          cashSales += amount;
          break;
        case 'REFUND':
          cashRefunds += amount;
          break;
        case 'PAY_IN':
          payIn += amount;
          break;
        case 'PAY_OUT':
          payOut += amount;
          break;
      }
    }

    const expectedCash =
      Math.round((openingCash + cashSales + payIn - cashRefunds - payOut) * 100) / 100;

    return { openingCash, cashSales, cashRefunds, payIn, payOut, expectedCash };
  }

  async listShifts(
    businessId: string,
    options?: { status?: CashShiftStatus; limit?: number },
  ) {
    const shifts = await prisma.cashShift.findMany({
      where: {
        businessId,
        ...(options?.status ? { status: options.status } : {}),
      },
      orderBy: { openedAt: 'desc' },
      take: options?.limit ?? 50,
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        destinationAccount: { select: { id: true, name: true, accountType: true } },
        movements: { select: { type: true, amount: true } },
      },
    });

    return shifts.map((shift) => {
      const stats = this.summarizeMovements(shift.movements);
      const mapped = mapShift({
        ...shift,
        movements: undefined,
      });
      const expectedCash =
        shift.status === 'CLOSED' && shift.expectedCash != null
          ? Number(shift.expectedCash)
          : stats.expectedCash;

      return {
        ...mapped,
        stats: {
          cashSales: stats.cashSales,
          cashRefunds: stats.cashRefunds,
          payIn: stats.payIn,
          payOut: stats.payOut,
          expectedCash,
        },
      };
    });
  }

  async getShiftSummary(businessId: string, shiftId: string) {
    const shift = await this.getById(businessId, shiftId, true);
    const movements = shift.movements ?? [];

    const summary = {
      cashSales: 0,
      cashRefunds: 0,
      payIn: 0,
      payOut: 0,
      openingCash: Number(shift.openingCash),
    };

    for (const m of movements) {
      const amount = Number(m.amount);
      switch (m.type) {
        case 'SALE':
          summary.cashSales += amount;
          break;
        case 'REFUND':
          summary.cashRefunds += amount;
          break;
        case 'PAY_IN':
          summary.payIn += amount;
          break;
        case 'PAY_OUT':
          summary.payOut += amount;
          break;
      }
    }

    const expectedCash =
      shift.status === 'OPEN'
        ? await this.computeExpectedCash(shiftId)
        : Number(shift.expectedCash ?? 0);

    return {
      shift,
      summary: {
        ...summary,
        expectedCash,
      },
    };
  }

  async ensureSettlementAccounts(businessId: string) {
    const count = await prisma.cashSettlementAccount.count({ where: { businessId } });
    if (count > 0) return;

    await prisma.cashSettlementAccount.createMany({
      data: [
        { businessId, name: 'Cash drawer', accountType: 'DRAWER' },
        { businessId, name: 'Owner handover', accountType: 'OWNER' },
        { businessId, name: 'Mobile wallet', accountType: 'WALLET' },
        { businessId, name: 'Bank account', accountType: 'BANK' },
        { businessId, name: 'Other account', accountType: 'OTHER' },
      ],
    });
  }

  async listSettlementAccounts(businessId: string) {
    await this.ensureSettlementAccounts(businessId);
    const accounts = await prisma.cashSettlementAccount.findMany({
      where: { businessId, isActive: true },
      orderBy: [{ accountType: 'asc' }, { name: 'asc' }],
    });
    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      accountType: account.accountType,
    }));
  }
}
