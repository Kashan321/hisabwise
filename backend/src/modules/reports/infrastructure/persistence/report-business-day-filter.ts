import { prismaBusinessDayRepository } from '../../../business-day/infrastructure/persistence/prisma-business-day.repository';
import type { ReportFilters } from './report-query-builder';

export async function enrichReportFilters(
  businessId: string,
  filters: ReportFilters,
): Promise<ReportFilters> {
  if (filters.businessDayIds?.length) return filters;

  let businessDayIds: string[] | undefined;

  if (filters.businessDayId) {
    businessDayIds = [filters.businessDayId];
  } else if (filters.from || filters.to) {
    const from = filters.from ?? filters.to!;
    const to = filters.to ?? filters.from!;
    const ids = await prismaBusinessDayRepository.findIdsByBusinessDateRange(
      businessId,
      from,
      to,
    );
    if (ids.length > 0) businessDayIds = ids;
  }

  return businessDayIds ? { ...filters, businessDayIds } : filters;
}
