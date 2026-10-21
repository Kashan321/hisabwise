import { prisma } from '../../../../shared/database/prisma-client';
import { analyticsService } from '../../../reports/application/services/analytics.service';
import { BusinessNotFoundError } from '../../domain/errors/platform.errors';

function dec(value: { toString(): string } | null | undefined): number {
  return value ? Number(value) : 0;
}

function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function resolveRange(from: string, to: string): { from: Date; to: Date } {
  const parseStart = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };
  const parseEnd = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  };
  return { from: parseStart(from), to: parseEnd(to) };
}

export interface PlatformTenantAnalyticsRow {
  businessId: string;
  name: string;
  slug: string;
  currency: string | null;
  subscriptionStatus: string;
  isSuspended: boolean;
  orderCount: number;
  revenue: string;
}

export class ListPlatformTenantAnalyticsUseCase {
  async execute(from: string, to: string): Promise<PlatformTenantAnalyticsRow[]> {
    const { from: fromDate, to: toDate } = resolveRange(from, to);

    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        subscriptionStatus: true,
        isSuspended: true,
      },
      orderBy: { name: 'asc' },
    });

    const stats = await prisma.order.groupBy({
      by: ['businessId'],
      where: {
        status: 'COMPLETED',
        createdAt: { gte: fromDate, lte: toDate },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const statByBusiness = new Map(
      stats.map((row) => [
        row.businessId,
        { orderCount: row._count, revenue: dec(row._sum.totalAmount) },
      ]),
    );

    return businesses
      .map((business) => {
        const stat = statByBusiness.get(business.id);
        return {
          businessId: business.id,
          name: business.name,
          slug: business.slug,
          currency: business.currency,
          subscriptionStatus: business.subscriptionStatus,
          isSuspended: business.isSuspended,
          orderCount: stat?.orderCount ?? 0,
          revenue: money(stat?.revenue ?? 0),
        };
      })
      .sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }
}

export class GetPlatformTenantAnalyticsDetailUseCase {
  async execute(businessId: string, from: string, to: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        subscriptionStatus: true,
        isSuspended: true,
      },
    });
    if (!business) throw new BusinessNotFoundError();

    const filters = { from, to };
    const [sales, topProducts, payments, orderTypes] = await Promise.all([
      analyticsService.getSalesReport(businessId, filters),
      analyticsService.getProductReport(businessId, filters, 'revenue', 15),
      analyticsService.getPaymentReport(businessId, filters),
      analyticsService.getOrderTypeReport(businessId, filters),
    ]);

    return {
      business,
      period: { from, to },
      sales,
      topProducts,
      payments,
      orderTypes,
    };
  }
}
