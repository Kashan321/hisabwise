import { prisma } from '../../../../shared/database/prisma-client';
import {
  BusinessDayAlreadyClosedError,
  BusinessDayAlreadyOpenError,
  BusinessDayHasOpenShiftsError,
  BusinessDayNotFoundError,
} from '../../domain/errors/business-day.errors';
import {
  buildStaleBusinessDayReminder,
  shouldAutoCloseStaleBusinessDay,
  type BusinessDayLifecycle,
} from '../../application/business-day-lifecycle';
import {
  businessDateToUtcDate,
  resolveBusinessDateKey,
} from '../../../../shared/date/business-day-resolver';

function mapDay(row: {
  id: string;
  businessId: string;
  businessDate: Date;
  startedAt: Date;
  endedAt: Date | null;
  status: 'OPEN' | 'CLOSED';
  lastOrderSequence: number;
  openCount: number;
  closeCount: number;
  lastOpenedAt: Date;
  openedById: string;
  closedById: string | null;
  openedBy?: { id: string; name: string } | null;
  closedBy?: { id: string; name: string } | null;
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    businessDate: row.businessDate.toISOString().slice(0, 10),
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    status: row.status,
    lastOrderSequence: row.lastOrderSequence,
    openCount: row.openCount,
    closeCount: row.closeCount,
    lastOpenedAt: row.lastOpenedAt.toISOString(),
    openedById: row.openedById,
    closedById: row.closedById,
    openedByName: row.openedBy?.name ?? null,
    closedByName:
      row.closedBy?.name ??
      (row.status === 'CLOSED' && row.endedAt && !row.closedById ? 'Closed by system' : null),
  };
}

export class PrismaBusinessDayRepository {
  async getBusinessConfig(businessId: string) {
    return prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        businessDayStartTime: true,
        businessDayTimezone: true,
        businessDayAutoCloseEnabled: true,
        businessDayCloseReminderEnabled: true,
      },
    });
  }

  async getCurrentBusinessDateKey(businessId: string): Promise<string> {
    const config = await this.getBusinessConfig(businessId);
    return resolveBusinessDateKey(
      new Date(),
      config.businessDayStartTime,
      config.businessDayTimezone,
    );
  }

  async getCurrentWithLifecycle(businessId: string): Promise<{
    businessDay: ReturnType<typeof mapDay> | null;
    lifecycle: BusinessDayLifecycle;
    currentBusinessDate: string;
  }> {
    const currentBusinessDate = await this.getCurrentBusinessDateKey(businessId);
    const openDay = await this.findOpen(businessId);
    if (!openDay) {
      return { businessDay: null, lifecycle: {}, currentBusinessDate };
    }

    if (openDay.businessDate === currentBusinessDate) {
      return { businessDay: openDay, lifecycle: {}, currentBusinessDate };
    }

    const config = await this.getBusinessConfig(businessId);
    const openShift = await prisma.cashShift.findFirst({
      where: { businessId, status: 'OPEN' },
      select: { id: true },
    });
    const hasOpenShifts = Boolean(openShift);

    if (
      shouldAutoCloseStaleBusinessDay({
        openBusinessDate: openDay.businessDate,
        currentBusinessDate,
        autoCloseEnabled: config.businessDayAutoCloseEnabled,
        hasOpenShifts,
      })
    ) {
      const closed = await this.close(businessId, openDay.id, null);
      return {
        businessDay: null,
        lifecycle: {
          autoClosed: {
            businessDayId: closed.id,
            businessDate: closed.businessDate,
          },
        },
        currentBusinessDate,
      };
    }

    const reminder = buildStaleBusinessDayReminder({
      openBusinessDate: openDay.businessDate,
      currentBusinessDate,
      businessDayId: openDay.id,
      hasOpenShifts,
      reminderEnabled: config.businessDayCloseReminderEnabled,
    });

    return {
      businessDay: openDay,
      lifecycle: reminder ? { reminder } : {},
      currentBusinessDate,
    };
  }

  async findOpen(businessId: string) {
    const row = await prisma.businessDay.findFirst({
      where: { businessId, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    return row ? mapDay(row) : null;
  }

  async findById(businessId: string, id: string) {
    const row = await prisma.businessDay.findFirst({
      where: { id, businessId },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new BusinessDayNotFoundError();
    return mapDay(row);
  }

  async list(businessId: string, options?: { limit?: number }) {
    const rows = await prisma.businessDay.findMany({
      where: { businessId },
      orderBy: { businessDate: 'desc' },
      take: options?.limit ?? 50,
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    return rows.map(mapDay);
  }

  async open(businessId: string, openedById: string) {
    const existingOpen = await prisma.businessDay.findFirst({
      where: { businessId, status: 'OPEN' },
    });
    if (existingOpen) throw new BusinessDayAlreadyOpenError();

    const config = await this.getBusinessConfig(businessId);
    const now = new Date();
    const businessDateKey = resolveBusinessDateKey(
      now,
      config.businessDayStartTime,
      config.businessDayTimezone,
    );
    const businessDate = businessDateToUtcDate(businessDateKey);

    const closedForDate = await prisma.businessDay.findFirst({
      where: { businessId, businessDate, status: 'CLOSED' },
      orderBy: { endedAt: 'desc' },
    });

    if (closedForDate) {
      const row = await prisma.businessDay.update({
        where: { id: closedForDate.id },
        data: {
          status: 'OPEN',
          endedAt: null,
          closedById: null,
          openedById,
          lastOpenedAt: now,
          openCount: { increment: 1 },
        },
        include: {
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
        },
      });

      return mapDay(row);
    }

    const row = await prisma.businessDay.create({
      data: {
        businessId,
        businessDate,
        startedAt: now,
        lastOpenedAt: now,
        status: 'OPEN',
        lastOrderSequence: 0,
        openCount: 1,
        closeCount: 0,
        openedById,
      },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });

    return mapDay(row);
  }

  async close(businessId: string, businessDayId: string, closedById: string | null) {
    const day = await prisma.businessDay.findFirst({
      where: { id: businessDayId, businessId },
    });
    if (!day) throw new BusinessDayNotFoundError();
    if (day.status === 'CLOSED') throw new BusinessDayAlreadyClosedError();

    const openShift = await prisma.cashShift.findFirst({
      where: { businessId, status: 'OPEN' },
    });
    if (openShift) throw new BusinessDayHasOpenShiftsError();

    const row = await prisma.businessDay.update({
      where: { id: businessDayId },
      data: {
        status: 'CLOSED',
        endedAt: new Date(),
        closedById,
        closeCount: { increment: 1 },
      },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });

    return mapDay(row);
  }

  async getSummary(businessId: string, businessDayId: string) {
    const day = await this.findById(businessId, businessDayId);

    const orders = await prisma.order.findMany({
      where: { businessId, businessDayId, status: 'COMPLETED' },
      select: { id: true, totalAmount: true, cashShiftId: true },
    });

    const shifts = await prisma.cashShift.findMany({
      where: { businessId, businessDayId },
      select: {
        id: true,
        status: true,
        openedAt: true,
        closedAt: true,
        openedBy: { select: { name: true } },
      },
      orderBy: { openedAt: 'asc' },
    });

    const shiftSummaries = await Promise.all(
      shifts.map(async (shift) => {
        const shiftOrders = orders.filter((o) => o.cashShiftId === shift.id);
        const sales = shiftOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
        return {
          shiftId: shift.id,
          status: shift.status,
          openedAt: shift.openedAt.toISOString(),
          closedAt: shift.closedAt?.toISOString() ?? null,
          openedByName: shift.openedBy.name,
          orderCount: shiftOrders.length,
          sales: Math.round(sales * 100) / 100,
        };
      }),
    );

    const totalSales = orders.reduce((s, o) => s + Number(o.totalAmount), 0);

    return {
      businessDay: day,
      orderCount: orders.length,
      totalSales: Math.round(totalSales * 100) / 100,
      shifts: shiftSummaries,
    };
  }

  async findIdsByBusinessDateRange(
    businessId: string,
    from: string,
    to: string,
  ): Promise<string[]> {
    const fromDate = businessDateToUtcDate(from);
    const toDate = businessDateToUtcDate(to);
    const rows = await prisma.businessDay.findMany({
      where: {
        businessId,
        businessDate: { gte: fromDate, lte: toDate },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}

export const prismaBusinessDayRepository = new PrismaBusinessDayRepository();
