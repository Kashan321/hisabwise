import { prismaBusinessDayRepository } from '../../../business-day/infrastructure/persistence/prisma-business-day.repository';
import type { ListOrdersFilters } from '../../domain/entities/order.entity';

export async function enrichOrderListFilters(
  businessId: string,
  filters?: ListOrdersFilters,
): Promise<ListOrdersFilters | undefined> {
  if (!filters) return filters;
  if (filters.businessDayIds?.length) return filters;

  let businessDayIds: string[] | undefined;

  if (filters.businessDayId) {
    businessDayIds = [filters.businessDayId];
  } else if (filters.date) {
    const ids = await prismaBusinessDayRepository.findIdsByBusinessDateRange(
      businessId,
      filters.date,
      filters.date,
    );
    if (ids.length > 0) businessDayIds = ids;
  } else if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ?? filters.dateTo!;
    const to = filters.dateTo ?? filters.dateFrom!;
    const ids = await prismaBusinessDayRepository.findIdsByBusinessDateRange(
      businessId,
      from,
      to,
    );
    if (ids.length > 0) businessDayIds = ids;
  }

  return businessDayIds ? { ...filters, businessDayIds } : filters;
}
