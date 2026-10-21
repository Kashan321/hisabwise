import { GetDailyRevenueUseCase } from '../application/use-cases/get-daily-revenue.use-case';
import { GetPaymentBreakdownUseCase } from '../application/use-cases/get-payment-breakdown.use-case';
import { GetSalesSummaryUseCase } from '../application/use-cases/get-sales-summary.use-case';
import { ExportInvoicesUseCase } from '../application/use-cases/export-invoices.use-case';
import { ListInvoicesUseCase } from '../application/use-cases/list-invoices.use-case';
import { analyticsService } from '../application/services/analytics.service';
import { PrismaReportRepository } from './persistence/prisma-report.repository';

const reportRepository = new PrismaReportRepository();

export const reportsModule = {
  getSalesSummary: new GetSalesSummaryUseCase(reportRepository),
  getPaymentBreakdown: new GetPaymentBreakdownUseCase(reportRepository),
  getDailyRevenue: new GetDailyRevenueUseCase(reportRepository),
  listInvoices: new ListInvoicesUseCase(reportRepository),
  exportInvoices: new ExportInvoicesUseCase(reportRepository),
  analytics: analyticsService,
};
