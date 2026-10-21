import type { OrderStatus, OrderType, PaymentMethod, Prisma } from '@prisma/client';
import { resolveReportDateRange, type ReportDateRangeInput } from './report-date-range';

export interface ReportFilters extends ReportDateRangeInput {
  orderType?: OrderType;
  paymentMethod?: PaymentMethod;
  employeeId?: string;
  categoryId?: string;
  menuItemId?: string;
  tableId?: string;
  riderId?: string;
  customerId?: string;
  promotionId?: string;
  cashShiftId?: string;
  businessDayId?: string;
  businessDayIds?: string[];
  inventoryItemId?: string;
  supplier?: string;
  status?: OrderStatus;
}

function buildDateFilter(filters: ReportFilters): Prisma.OrderWhereInput {
  const { from, to } = resolveReportDateRange(filters);
  if (filters.businessDayIds?.length) {
    return {
      OR: [
        { businessDayId: { in: filters.businessDayIds } },
        { businessDayId: null, createdAt: { gte: from, lte: to } },
      ],
    };
  }
  return { createdAt: { gte: from, lte: to } };
}

export function buildCompletedOrderWhere(
  businessId: string,
  filters: ReportFilters,
): Prisma.OrderWhereInput {
  return {
    businessId,
    status: filters.status ?? 'COMPLETED',
    ...buildDateFilter(filters),
    ...(filters.orderType ? { orderType: filters.orderType } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.tableId ? { tableId: filters.tableId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.promotionId ? { promotionId: filters.promotionId } : {}),
    ...(filters.cashShiftId ? { cashShiftId: filters.cashShiftId } : {}),
    ...(filters.employeeId
      ? {
          OR: [
            { createdById: filters.employeeId },
            { waiterId: filters.employeeId },
            { completedById: filters.employeeId },
            { riderId: filters.employeeId },
          ],
        }
      : {}),
    ...(filters.riderId ? { riderId: filters.riderId } : {}),
  };
}

export function buildOrderItemWhere(
  businessId: string,
  filters: ReportFilters,
): Prisma.OrderItemWhereInput {
  return {
    order: buildCompletedOrderWhere(businessId, filters),
    ...(filters.menuItemId ? { menuItemId: filters.menuItemId } : {}),
    ...(filters.categoryId
      ? { menuItem: { categoryId: filters.categoryId } }
      : {}),
  };
}
