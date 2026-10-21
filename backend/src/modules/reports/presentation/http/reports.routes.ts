import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { reportsController } from './reports.controller';
import {
  listInvoicesQuerySchema,
  orderReportQuerySchema,
  productReportQuerySchema,
  reportDateRangeQuerySchema,
  reportFiltersQuerySchema,
} from './reports.validators';

const canViewReports = requireAnyPermission(
  'reports.view',
  'orders.manage',
  'cash.shift',
  'delivery.execute',
  'delivery.view',
);

const canViewFinancial = requireAnyPermission('reports.view', 'orders.manage', '*');

export const reportsRouter = Router();

reportsRouter.get(
  '/summary',
  requireAuth,
  canViewFinancial,
  validateQuery(reportDateRangeQuerySchema),
  reportsController.summary,
);

reportsRouter.get(
  '/payment-breakdown',
  requireAuth,
  canViewFinancial,
  validateQuery(reportDateRangeQuerySchema),
  reportsController.paymentBreakdown,
);

reportsRouter.get(
  '/daily-revenue',
  requireAuth,
  canViewFinancial,
  validateQuery(reportDateRangeQuerySchema),
  reportsController.dailyRevenue,
);

reportsRouter.get(
  '/invoices',
  requireAuth,
  canViewFinancial,
  validateQuery(listInvoicesQuerySchema),
  reportsController.listInvoices,
);

reportsRouter.get(
  '/invoices/export',
  requireAuth,
  canViewFinancial,
  validateQuery(reportDateRangeQuerySchema),
  reportsController.exportInvoices,
);

reportsRouter.get(
  '/dashboard',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.dashboard,
);

reportsRouter.get(
  '/sales',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.sales,
);

reportsRouter.get(
  '/products',
  requireAuth,
  canViewFinancial,
  validateQuery(productReportQuerySchema),
  reportsController.products,
);

reportsRouter.get(
  '/profit',
  requireAuth,
  canViewFinancial,
  validateQuery(productReportQuerySchema),
  reportsController.profit,
);

reportsRouter.get(
  '/variants',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.variants,
);

reportsRouter.get(
  '/modifiers',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.modifiers,
);

reportsRouter.get(
  '/payments',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.payments,
);

reportsRouter.get(
  '/employees',
  requireAuth,
  canViewReports,
  validateQuery(reportFiltersQuerySchema),
  reportsController.employees,
);

reportsRouter.get(
  '/order-types',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.orderTypes,
);

reportsRouter.get(
  '/tables',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.tables,
);

reportsRouter.get(
  '/delivery',
  requireAuth,
  canViewReports,
  validateQuery(reportFiltersQuerySchema),
  reportsController.delivery,
);

reportsRouter.get(
  '/customers',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.customers,
);

reportsRouter.get(
  '/tips',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.tips,
);

reportsRouter.get(
  '/promotions',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.promotions,
);

reportsRouter.get(
  '/purchases',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.purchases,
);

reportsRouter.get(
  '/wastage',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.wastage,
);

reportsRouter.get(
  '/inventory',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.inventory,
);

reportsRouter.get(
  '/orders',
  requireAuth,
  canViewFinancial,
  validateQuery(orderReportQuerySchema),
  reportsController.orders,
);

reportsRouter.get(
  '/export/:type',
  requireAuth,
  canViewFinancial,
  validateQuery(reportFiltersQuerySchema),
  reportsController.exportCsv,
);
