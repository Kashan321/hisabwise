import { Request, Response } from 'express';
import { z } from 'zod';
import { reportsModule } from '../../infrastructure/reports.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import type { ReportFilters } from '../../infrastructure/persistence/report-query-builder';
import {
  listInvoicesQuerySchema,
  orderReportQuerySchema,
  productReportQuerySchema,
  reportDateRangeQuerySchema,
  reportFiltersQuerySchema,
} from './reports.validators';

type ReportDateRangeQuery = z.infer<typeof reportDateRangeQuerySchema>;
type ReportFiltersQuery = z.infer<typeof reportFiltersQuerySchema>;
type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
type OrderReportQuery = z.infer<typeof orderReportQuerySchema>;
type ProductReportQuery = z.infer<typeof productReportQuerySchema>;

function hasFullReportsAccess(req: Request): boolean {
  const perms = req.tenantContext?.permissions ?? [];
  return perms.includes('*') || perms.includes('reports.view') || perms.includes('orders.manage');
}

function scopedEmployeeId(req: Request): string | undefined {
  if (hasFullReportsAccess(req)) return undefined;
  const perms = req.tenantContext?.permissions ?? [];
  if (perms.includes('cash.shift') || perms.includes('orders.create')) {
    return req.tenantContext?.userId;
  }
  return undefined;
}

function scopedRiderId(req: Request): string | undefined {
  if (hasFullReportsAccess(req)) return undefined;
  const perms = req.tenantContext?.permissions ?? [];
  if (perms.includes('delivery.execute')) return req.tenantContext?.userId;
  return undefined;
}

function denyFinancial(req: Request, res: Response): boolean {
  if (hasFullReportsAccess(req)) return false;
  res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'You do not have permission to view this report' },
  });
  return true;
}

export class ReportsController {
  summary = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as ReportDateRangeQuery;
    const summary = await reportsModule.getSalesSummary.execute(
      req.tenantContext!.businessId,
      query,
    );
    return success(res, { summary });
  });

  paymentBreakdown = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as ReportDateRangeQuery;
    const breakdown = await reportsModule.getPaymentBreakdown.execute(
      req.tenantContext!.businessId,
      query,
    );
    return success(res, { breakdown });
  });

  dailyRevenue = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as ReportDateRangeQuery;
    const daily = await reportsModule.getDailyRevenue.execute(
      req.tenantContext!.businessId,
      query,
    );
    return success(res, { daily });
  });

  listInvoices = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as ListInvoicesQuery;
    const result = await reportsModule.listInvoices.execute(
      req.tenantContext!.businessId,
      query,
    );
    return success(res, { invoices: result.invoices, meta: { total: result.total } });
  });

  exportInvoices = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as ReportDateRangeQuery;
    const exportResult = await reportsModule.exportInvoices.execute(
      req.tenantContext!.businessId,
      query,
    );
    return success(res, exportResult);
  });

  dashboard = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const query = req.validatedQuery as ReportFiltersQuery;
    const businessId = req.tenantContext!.businessId;
    const [dashboard, charts] = await Promise.all([
      reportsModule.analytics.getDashboard(businessId, query),
      reportsModule.analytics.getDashboardCharts(businessId, query),
    ]);
    return success(res, { dashboard, charts });
  });

  sales = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const report = await reportsModule.analytics.getSalesReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { report });
  });

  products = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const query = req.validatedQuery as ProductReportQuery;
    const rows = await reportsModule.analytics.getProductReport(
      req.tenantContext!.businessId,
      query,
      query.sort,
      query.limit,
    );
    return success(res, { rows });
  });

  profit = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const query = req.validatedQuery as ProductReportQuery;
    const report = await reportsModule.analytics.getProfitReport(
      req.tenantContext!.businessId,
      query,
      query.limit,
    );
    return success(res, report);
  });

  variants = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getVariantReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  modifiers = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getModifierReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  payments = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getPaymentReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  employees = asyncHandler(async (req: Request, res: Response) => {
    const restrict = scopedEmployeeId(req);
    if (!hasFullReportsAccess(req) && !restrict) {
      if (denyFinancial(req, res)) return;
    }
    const rows = await reportsModule.analytics.getEmployeeReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
      restrict,
    );
    return success(res, { rows });
  });

  orderTypes = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getOrderTypeReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  tables = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getTableReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  delivery = asyncHandler(async (req: Request, res: Response) => {
    const restrict = scopedRiderId(req);
    if (!hasFullReportsAccess(req) && !restrict) {
      if (denyFinancial(req, res)) return;
    }
    const rows = await reportsModule.analytics.getDeliveryReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
      restrict,
    );
    return success(res, { rows });
  });

  customers = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const summary = await reportsModule.analytics.getCustomerReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { summary });
  });

  tips = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const report = reportsModule.analytics.getTipsReport();
    return success(res, { report });
  });

  promotions = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getPromotionReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  purchases = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getPurchaseReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  wastage = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getWastageReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  inventory = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const rows = await reportsModule.analytics.getInventoryReport(
      req.tenantContext!.businessId,
      req.validatedQuery as ReportFiltersQuery,
    );
    return success(res, { rows });
  });

  orders = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const result = await reportsModule.analytics.getOrderReport(
      req.tenantContext!.businessId,
      req.validatedQuery as OrderReportQuery,
    );
    return success(res, result);
  });

  exportCsv = asyncHandler(async (req: Request, res: Response) => {
    if (denyFinancial(req, res)) return;
    const businessId = req.tenantContext!.businessId;
    const query = req.validatedQuery as ReportFiltersQuery;
    const reportType = req.params.type;

    let headers: string[] = [];
    let rows: (string | number | null | undefined)[][] = [];

    switch (reportType) {
      case 'sales': {
        const report = await reportsModule.analytics.getSalesReport(businessId, query);
        headers = ['Metric', 'Value'];
        rows = [
          ['Gross Sales', report.grossSales],
          ['Discounts', report.discounts],
          ['Taxes', report.taxes],
          ['Service Charges', report.serviceCharges],
          ['Refunds', report.refunds],
          ['Net Sales', report.netSales],
          ['Orders', report.orderCount],
          ['Average Order', report.averageOrderValue],
        ];
        break;
      }
      case 'products': {
        const data = await reportsModule.analytics.getProductReport(businessId, query, 'quantity', 500);
        headers = ['Product', 'Category', 'Qty Sold', 'Revenue', 'Avg Price', 'Orders'];
        rows = data.map((r) => [
          r.name,
          r.categoryName,
          r.quantitySold,
          r.revenue,
          r.averageSellingPrice,
          r.orderCount,
        ]);
        break;
      }
      case 'profit': {
        const data = await reportsModule.analytics.getProfitReport(businessId, query, 500);
        headers = [
          'Product',
          'Category',
          'Qty Sold',
          'Revenue',
          'Estimated Cost',
          'Estimated Profit',
          'Estimated Margin %',
        ];
        rows = data.rows.map((r) => [
          r.name,
          r.categoryName,
          r.quantitySold,
          r.revenue,
          r.estimatedCost,
          r.estimatedProfit,
          r.estimatedMarginPercent,
        ]);
        break;
      }
      case 'payments': {
        const data = await reportsModule.analytics.getPaymentReport(businessId, query);
        headers = ['Method', 'Transactions', 'Total', 'Refunds', 'Net'];
        rows = data.map((r) => [
          r.method,
          r.transactionCount,
          r.totalAmount,
          r.refundAmount,
          r.netAmount,
        ]);
        break;
      }
      case 'orders': {
        const data = await reportsModule.analytics.getOrderReport(businessId, {
          ...query,
          limit: 500,
        });
        headers = [
          'Ticket',
          'Date',
          'Type',
          'Status',
          'Table',
          'Customer',
          'Total',
          'Payment',
        ];
        rows = data.rows.map((r) => [
          r.ticketNumber,
          r.createdAt,
          r.orderType,
          r.status,
          r.tableIdentifier,
          r.customerName,
          r.totalAmount,
          r.paymentMethod,
        ]);
        break;
      }
      case 'inventory': {
        const data = await reportsModule.analytics.getInventoryReport(businessId, query);
        headers = [
          'Item',
          'Unit',
          'Current',
          'Opening',
          'Purchased',
          'Sales Use',
          'Wastage',
          'Adjustments',
          'Expected Closing',
        ];
        rows = data.map((r) => [
          r.itemName,
          r.unit,
          r.currentStock,
          r.opening,
          r.purchased,
          r.salesConsumption,
          r.wastage,
          r.adjustments,
          r.expectedClosing,
        ]);
        break;
      }
      case 'purchases': {
        const data = await reportsModule.analytics.getPurchaseReport(businessId, query);
        headers = ['Date', 'Supplier', 'Item', 'Qty', 'Unit Cost', 'Total', 'Invoice', 'Added By'];
        rows = data.map((r) => [
          r.purchasedAt,
          r.supplier,
          r.itemName,
          r.quantity,
          r.unitCost,
          r.totalCost,
          r.invoiceRef,
          r.addedByName,
        ]);
        break;
      }
      case 'wastage': {
        const data = await reportsModule.analytics.getWastageReport(businessId, query);
        headers = ['Date', 'Item', 'Qty', 'Reason', 'Value', 'Employee', 'Note'];
        rows = data.map((r) => [
          r.createdAt,
          r.itemName,
          r.quantity,
          r.reason,
          r.estimatedValue,
          r.employeeName,
          r.note,
        ]);
        break;
      }
      default:
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REPORT', message: `Unknown export type: ${reportType}` },
        });
        return;
    }

    const exportResult = reportsModule.analytics.exportReport(
      reportType,
      businessId,
      query as ReportFilters,
      rows,
      headers,
    );
    return success(res, { ...exportResult, filename: `${reportType}-${exportResult.filename}` });
  });
}

export const reportsController = new ReportsController();
