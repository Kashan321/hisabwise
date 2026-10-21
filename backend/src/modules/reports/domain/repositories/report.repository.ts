import {
  DailyRevenueItem,
  ExportInvoicesResult,
  ListInvoicesFilters,
  ListInvoicesResult,
  PaymentBreakdownItem,
  ReportDateRange,
  SalesSummary,
} from '../entities/report.entity';

export interface ReportRepository {
  getSalesSummary(businessId: string, range: ReportDateRange): Promise<SalesSummary>;
  getPaymentBreakdown(businessId: string, range: ReportDateRange): Promise<PaymentBreakdownItem[]>;
  getDailyRevenue(businessId: string, range: ReportDateRange): Promise<DailyRevenueItem[]>;
  listInvoices(businessId: string, filters: ListInvoicesFilters): Promise<ListInvoicesResult>;
  exportInvoices(businessId: string, filters: ReportDateRange): Promise<ExportInvoicesResult>;
}
