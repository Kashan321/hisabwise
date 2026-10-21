import { Prisma } from '@prisma/client';
import { ListOrdersFilters } from '../../domain/entities/order.entity';

function dayBounds(date: string): { from: Date; to: Date } {
  const [year, month, day] = date.split('-').map(Number);
  return {
    from: new Date(year, month - 1, day, 0, 0, 0, 0),
    to: new Date(year, month - 1, day, 23, 59, 59, 999),
  };
}

function normalizeTableIdentifier(value: string): string {
  return value.trim().replace(/^#/, '');
}

function appendOrderSearchFilter(
  where: Prisma.OrderWhereInput,
  search?: string,
): Prisma.OrderWhereInput {
  const query = search?.trim();
  if (!query) return where;

  const or: Prisma.OrderWhereInput[] = [
    { customerName: { contains: query, mode: 'insensitive' } },
    { customerPhone: { contains: query, mode: 'insensitive' } },
    { ticketPrefix: { contains: query, mode: 'insensitive' } },
    { notes: { contains: query, mode: 'insensitive' } },
  ];

  const ticketNum = parseInt(query.replace(/\D/g, ''), 10);
  if (!Number.isNaN(ticketNum) && ticketNum > 0) {
    or.push({ ticketNumber: ticketNum });
  }

  return { AND: [where, { OR: or }] };
}

export function buildOrderListWhere(
  businessId: string,
  filters?: ListOrdersFilters,
): Prisma.OrderWhereInput {
  let where: Prisma.OrderWhereInput = { businessId };

  if (!filters) return where;

  if (filters.status) {
    where.status = filters.status;
  } else if (filters.statusGroup === 'active') {
    where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
  } else if (filters.statusGroup === 'completed') {
    where.status = 'COMPLETED';
  } else if (filters.statusGroup === 'cancelled') {
    where.status = 'CANCELLED';
  }

  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.orderType) {
    where.orderType = filters.orderType;
  }

  if (filters.waiterId) {
    where.waiterId = filters.waiterId;
  }

  if (filters.riderId) {
    where.riderId = filters.riderId;
  }

  if (filters.deliveryStatus) {
    where.deliveryStatus = filters.deliveryStatus;
  }

  if (filters.isDraft !== undefined) {
    where.isDraft = filters.isDraft;
  } else if (filters.excludeDrafts) {
    where.isDraft = false;
  } else if (!filters.includeDrafts) {
    where.isDraft = false;
  }

  if (filters.tableId) {
    where.tableId = filters.tableId;
  } else if (filters.tableIdentifier?.trim()) {
    const tableIdentifier = normalizeTableIdentifier(filters.tableIdentifier);
    if (tableIdentifier) {
      where.table = {
        tableIdentifier: { contains: tableIdentifier, mode: 'insensitive' },
      };
    }
  }

  if (filters.cashShiftId) {
    where.cashShiftId = filters.cashShiftId;
  }

  if (filters.businessDayId) {
    where.businessDayId = filters.businessDayId;
  } else if (filters.businessDayIds?.length) {
    const from = filters.dateFrom ? dayBounds(filters.dateFrom).from : undefined;
    const to = filters.dateTo ? dayBounds(filters.dateTo).to : undefined;
    const legacyCreatedAt =
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : filters.date
          ? (() => {
              const bounds = dayBounds(filters.date);
              return { createdAt: { gte: bounds.from, lte: bounds.to } };
            })()
          : {};

    where.OR = [
      { businessDayId: { in: filters.businessDayIds } },
      { businessDayId: null, ...legacyCreatedAt },
    ];
  } else if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? dayBounds(filters.dateFrom).from : undefined;
    const to = filters.dateTo ? dayBounds(filters.dateTo).to : undefined;
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  } else if (filters.date) {
    const { from, to } = dayBounds(filters.date);
    where.createdAt = { gte: from, lte: to };
  }

  if (filters.minTotal !== undefined || filters.maxTotal !== undefined) {
    where.totalAmount = {
      ...(filters.minTotal !== undefined ? { gte: filters.minTotal } : {}),
      ...(filters.maxTotal !== undefined ? { lte: filters.maxTotal } : {}),
    };
  }

  where = appendOrderSearchFilter(where, filters.search);

  return where;
}
