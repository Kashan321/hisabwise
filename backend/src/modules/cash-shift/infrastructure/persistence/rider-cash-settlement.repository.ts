import type { Prisma } from '@prisma/client';
import { getRawPrismaClient, prisma } from '../../../../shared/database/prisma-client';
import { formatOrderTicketLabel } from '../../../orders/application/services/order-ticket.service';
import { CashShiftNotOpenError } from '../../domain/errors/cash-shift.errors';
import {
  RiderCashSettlementAlreadyConfirmedError,
  RiderCashSettlementNotFoundError,
} from '../../domain/errors/rider-cash-settlement.errors';
import { PrismaCashShiftRepository } from './prisma-cash-shift.repository';

const cashShiftRepository = new PrismaCashShiftRepository();

function mapSettlement(row: {
  id: string;
  orderId: string;
  riderId: string;
  amount: Prisma.Decimal;
  status: 'PENDING' | 'CONFIRMED';
  cashShiftId: string | null;
  confirmedById: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  rider: { name: string };
  order: {
    ticketPrefix: string | null;
    ticketNumber: number | null;
    customerName: string | null;
    totalAmount: Prisma.Decimal;
  };
  confirmedBy?: { name: string } | null;
}) {
  return {
    id: row.id,
    orderId: row.orderId,
    riderId: row.riderId,
    riderName: row.rider.name,
    amount: Number(row.amount),
    status: row.status,
    cashShiftId: row.cashShiftId,
    confirmedById: row.confirmedById,
    confirmedByName: row.confirmedBy?.name ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    orderLabel:
      row.order.ticketPrefix && row.order.ticketNumber != null
        ? formatOrderTicketLabel(row.order.ticketPrefix, row.order.ticketNumber)
        : row.orderId.slice(0, 8),
    customerName: row.order.customerName,
    orderTotal: Number(row.order.totalAmount),
  };
}

const settlementInclude = {
  rider: { select: { name: true } },
  order: {
    select: {
      ticketPrefix: true,
      ticketNumber: true,
      customerName: true,
      totalAmount: true,
    },
  },
  confirmedBy: { select: { name: true } },
} satisfies Prisma.RiderCashSettlementInclude;

export class RiderCashSettlementRepository {
  async createPending(
    tx: Prisma.TransactionClient,
    data: {
      businessId: string;
      orderId: string;
      riderId: string;
      amount: number;
    },
  ) {
    const settlement = await tx.riderCashSettlement.create({
      data: {
        businessId: data.businessId,
        orderId: data.orderId,
        riderId: data.riderId,
        amount: data.amount,
        status: 'PENDING',
      },
      include: settlementInclude,
    });
    return mapSettlement(settlement);
  }

  async listPendingForRider(businessId: string, riderId: string) {
    const rows = await prisma.riderCashSettlement.findMany({
      where: { businessId, riderId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: settlementInclude,
    });
    const settlements = rows.map(mapSettlement);
    const totalPending = settlements.reduce((sum, row) => sum + row.amount, 0);
    return { totalPending, settlements };
  }

  async listPendingGrouped(businessId: string) {
    const rows = await prisma.riderCashSettlement.findMany({
      where: { businessId, status: 'PENDING' },
      orderBy: [{ rider: { name: 'asc' } }, { createdAt: 'asc' }],
      include: settlementInclude,
    });

    const byRider = new Map<
      string,
      { riderId: string; riderName: string; totalPending: number; settlements: ReturnType<typeof mapSettlement>[] }
    >();

    for (const row of rows) {
      const settlement = mapSettlement(row);
      const existing = byRider.get(row.riderId);
      if (existing) {
        existing.settlements.push(settlement);
        existing.totalPending += settlement.amount;
      } else {
        byRider.set(row.riderId, {
          riderId: row.riderId,
          riderName: row.rider.name,
          totalPending: settlement.amount,
          settlements: [settlement],
        });
      }
    }

    return { groups: Array.from(byRider.values()) };
  }

  async confirm(
    businessId: string,
    confirmedById: string,
    filter: { settlementId?: string; riderId?: string },
  ) {
    const openShift = await cashShiftRepository.findOpenShift(businessId);
    if (!openShift) throw new CashShiftNotOpenError();

    const where: Prisma.RiderCashSettlementWhereInput = {
      businessId,
      status: 'PENDING',
      ...(filter.settlementId ? { id: filter.settlementId } : {}),
      ...(filter.riderId ? { riderId: filter.riderId } : {}),
    };

    const pending = await prisma.riderCashSettlement.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: settlementInclude,
    });

    if (pending.length === 0) {
      throw new RiderCashSettlementNotFoundError();
    }

    const confirmed = await getRawPrismaClient().$transaction(async (tx) => {
      const results = [];
      for (const settlement of pending) {
        const updated = await tx.riderCashSettlement.update({
          where: { id: settlement.id },
          data: {
            status: 'CONFIRMED',
            cashShiftId: openShift.id,
            confirmedById,
            confirmedAt: new Date(),
          },
          include: settlementInclude,
        });

        await cashShiftRepository.recordCashSale(
          tx,
          businessId,
          openShift.id,
          settlement.orderId,
          Number(settlement.amount),
          confirmedById,
          'Rider cash handoff',
        );

        await tx.order.update({
          where: { id: settlement.orderId },
          data: { cashShiftId: openShift.id },
        });

        await tx.orderPayment.updateMany({
          where: { orderId: settlement.orderId, method: 'CASH' },
          data: { cashShiftId: openShift.id },
        });

        results.push(mapSettlement(updated));
      }
      return results;
    });

    return { confirmed, cashShiftId: openShift.id };
  }

  async getById(businessId: string, settlementId: string) {
    const row = await prisma.riderCashSettlement.findFirst({
      where: { id: settlementId, businessId },
      include: settlementInclude,
    });
    if (!row) throw new RiderCashSettlementNotFoundError();
    if (row.status === 'CONFIRMED') throw new RiderCashSettlementAlreadyConfirmedError();
    return mapSettlement(row);
  }
}

export const riderCashSettlementRepository = new RiderCashSettlementRepository();
