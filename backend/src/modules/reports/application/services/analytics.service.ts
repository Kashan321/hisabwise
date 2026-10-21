import type {
  CustomerReportRow,
  DeliveryReportRow,
  EmployeeReportRow,
  InventoryReportRow,
  ModifierPerformanceRow,
  OrderReportRow,
  OrderTypeReportRow,
  PaginatedResult,
  PaymentReportRow,
  ProductPerformanceRow,
  ProfitReportRow,
  ProfitReportSummary,
  PromotionReportRow,
  PurchaseReportRow,
  ReportsDashboard,
  SalesReport,
  TableReportRow,
  VariantPerformanceRow,
  WastageReportRow,
} from '../../domain/entities/analytics.entity';
import type { ReportFilters } from '../../infrastructure/persistence/report-query-builder';
import { enrichReportFilters } from '../../infrastructure/persistence/report-business-day-filter';
import { prismaAnalyticsRepository } from '../../infrastructure/persistence/prisma-analytics.repository';

async function scopedFilters(businessId: string, filters: ReportFilters) {
  return enrichReportFilters(businessId, filters);
}

export interface DashboardCharts {
  salesOverTime: Array<{ bucket: string; revenue: string; orderCount: number }>;
  salesByOrderType: OrderTypeReportRow[];
  salesByPaymentMethod: PaymentReportRow[];
  topProducts: ProductPerformanceRow[];
}

export interface CustomerSummary {
  totalCustomers: number;
  customersWithOrders: number;
  totalOrders: number;
  totalSpending: string;
  averageOrderValue: string;
  topCustomers: CustomerReportRow[];
}

export interface TipsReport {
  tipsAvailable: boolean;
  totalTips: string;
  tippedOrderCount: number;
  averageTip: string;
  byEmployee: Array<{ employeeId: string; employeeName: string; tips: string }>;
  note: string;
}

export class AnalyticsService {
  async getDashboard(businessId: string, filters: ReportFilters): Promise<ReportsDashboard> {
    return prismaAnalyticsRepository.getDashboard(businessId, await scopedFilters(businessId, filters));
  }

  async getDashboardCharts(businessId: string, filters: ReportFilters): Promise<DashboardCharts> {
    const scoped = await scopedFilters(businessId, filters);
    const [sales, orderTypes, payments, products] = await Promise.all([
      prismaAnalyticsRepository.getSalesReport(businessId, scoped),
      prismaAnalyticsRepository.getOrderTypeReport(businessId, scoped),
      prismaAnalyticsRepository.getPaymentReport(businessId, scoped),
      prismaAnalyticsRepository.getProductReport(businessId, scoped, 'quantity', 5),
    ]);
    return {
      salesOverTime: sales.trend.map((t) => ({
        bucket: t.bucket,
        revenue: t.revenue,
        orderCount: t.orderCount,
      })),
      salesByOrderType: orderTypes,
      salesByPaymentMethod: payments,
      topProducts: products,
    };
  }

  async getSalesReport(businessId: string, filters: ReportFilters): Promise<SalesReport> {
    return prismaAnalyticsRepository.getSalesReport(businessId, await scopedFilters(businessId, filters));
  }

  async getProductReport(
    businessId: string,
    filters: ReportFilters,
    sort?: 'quantity' | 'revenue',
    limit?: number,
  ): Promise<ProductPerformanceRow[]> {
    return prismaAnalyticsRepository.getProductReport(
      businessId,
      await scopedFilters(businessId, filters),
      sort,
      limit,
    );
  }

  async getProfitReport(
    businessId: string,
    filters: ReportFilters,
    limit?: number,
  ): Promise<{ summary: ProfitReportSummary; rows: ProfitReportRow[] }> {
    return prismaAnalyticsRepository.getProfitReport(
      businessId,
      await scopedFilters(businessId, filters),
      limit ?? 100,
    );
  }

  async getVariantReport(businessId: string, filters: ReportFilters): Promise<VariantPerformanceRow[]> {
    return prismaAnalyticsRepository.getVariantReport(businessId, await scopedFilters(businessId, filters));
  }

  async getModifierReport(businessId: string, filters: ReportFilters): Promise<ModifierPerformanceRow[]> {
    return prismaAnalyticsRepository.getModifierReport(businessId, await scopedFilters(businessId, filters));
  }

  async getPaymentReport(businessId: string, filters: ReportFilters): Promise<PaymentReportRow[]> {
    return prismaAnalyticsRepository.getPaymentReport(businessId, await scopedFilters(businessId, filters));
  }

  async getEmployeeReport(
    businessId: string,
    filters: ReportFilters,
    restrictToEmployeeId?: string,
  ): Promise<EmployeeReportRow[]> {
    const base = await scopedFilters(businessId, filters);
    const scoped = restrictToEmployeeId ? { ...base, employeeId: restrictToEmployeeId } : base;
    return prismaAnalyticsRepository.getEmployeeReport(businessId, scoped);
  }

  async getOrderTypeReport(businessId: string, filters: ReportFilters): Promise<OrderTypeReportRow[]> {
    return prismaAnalyticsRepository.getOrderTypeReport(businessId, await scopedFilters(businessId, filters));
  }

  async getTableReport(businessId: string, filters: ReportFilters): Promise<TableReportRow[]> {
    return prismaAnalyticsRepository.getTableReport(businessId, await scopedFilters(businessId, filters));
  }

  async getDeliveryReport(
    businessId: string,
    filters: ReportFilters,
    restrictToRiderId?: string,
  ): Promise<DeliveryReportRow[]> {
    const base = await scopedFilters(businessId, filters);
    const scoped = restrictToRiderId ? { ...base, riderId: restrictToRiderId } : base;
    return prismaAnalyticsRepository.getDeliveryReport(businessId, scoped);
  }

  async getCustomerReport(
    businessId: string,
    filters: ReportFilters,
    limit?: number,
  ): Promise<CustomerSummary> {
    const scoped = await scopedFilters(businessId, filters);
    const rows = await prismaAnalyticsRepository.getCustomerReport(businessId, scoped, limit ?? 50);
    const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
    const totalSpending = rows.reduce((s, r) => s + Number(r.totalSpent), 0);
    return {
      totalCustomers: rows.length,
      customersWithOrders: rows.length,
      totalOrders,
      totalSpending: (Math.round(totalSpending * 100) / 100).toFixed(2),
      averageOrderValue:
        totalOrders > 0 ? (Math.round((totalSpending / totalOrders) * 100) / 100).toFixed(2) : '0.00',
      topCustomers: rows,
    };
  }

  async getPromotionReport(businessId: string, filters: ReportFilters): Promise<PromotionReportRow[]> {
    return prismaAnalyticsRepository.getPromotionReport(businessId, await scopedFilters(businessId, filters));
  }

  async getPurchaseReport(businessId: string, filters: ReportFilters): Promise<PurchaseReportRow[]> {
    return prismaAnalyticsRepository.getPurchaseReport(businessId, await scopedFilters(businessId, filters));
  }

  async getWastageReport(businessId: string, filters: ReportFilters): Promise<WastageReportRow[]> {
    return prismaAnalyticsRepository.getWastageReport(businessId, await scopedFilters(businessId, filters));
  }

  async getInventoryReport(businessId: string, filters: ReportFilters): Promise<InventoryReportRow[]> {
    return prismaAnalyticsRepository.getInventoryReport(businessId, await scopedFilters(businessId, filters));
  }

  async getOrderReport(
    businessId: string,
    filters: ReportFilters & { page?: number; limit?: number; search?: string },
  ): Promise<PaginatedResult<OrderReportRow>> {
    return prismaAnalyticsRepository.getOrderReport(businessId, await scopedFilters(businessId, filters));
  }

  getTipsReport(): TipsReport {
    return {
      tipsAvailable: false,
      totalTips: '0.00',
      tippedOrderCount: 0,
      averageTip: '0.00',
      byEmployee: [],
      note: 'Tips are not tracked separately in this POS. Service charges are reported under Sales.',
    };
  }

  exportReport(
    _reportType: string,
    _businessId: string,
    _filters: ReportFilters,
    rows: (string | number | null | undefined)[][],
    headers: string[],
  ) {
    return prismaAnalyticsRepository.exportCsv(headers, rows);
  }
}

export const analyticsService = new AnalyticsService();
