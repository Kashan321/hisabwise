import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { PLATFORM_PERMISSIONS } from '../../../../config/platform.constants';
import {
  platformAuthController,
  platformBusinessController,
  platformAdminManagementController,
  platformMetricsController,
  platformTenantAnalyticsController,
  platformBillingController,
  platformSettingsController,
} from './platform.controller';
import {
  createBusinessSchema,
  createPlatformAdminSchema,
  platformLoginSchema,
  updateBusinessSubscriptionSchema,
  updatePlatformAdminSchema,
  updatePlatformSettingsSchema,
  updateReceiptTemplateSchema,
  updateBusinessReceiptTemplateSchema,
  platformTenantAnalyticsQuerySchema,
} from './platform.validators';
import {
  platformReceiptController,
} from '../../../receipt/presentation/http/receipt.controller';
import {
  dismissSubscriptionInvoiceSchema,
  reviewPaymentSchema,
  sendPurchaseReceiptSchema,
  sendSubscriptionInvoiceSchema,
  setTrialDaysSchema,
  updateBillingSettingsSchema,
} from '../../../billing/presentation/http/billing.validators';
import { platformFeedbackController } from '../../../feedback/presentation/http/feedback.controller';
import {
  listPlatformFeedbackQuerySchema,
  reviewFeedbackTicketSchema,
  updateFeedbackContactSettingsSchema,
} from '../../../feedback/presentation/http/feedback.validators';
import { platformDemoController } from '../../../demo/presentation/http/demo.controller';
import { platformMenuGalleryController } from '../../../menu-gallery/presentation/http/menu-gallery.controller';
import {
  createMenuGalleryImageSchema,
  importMenuGalleryCsvPasteSchema,
  updateMenuGalleryImageSchema,
} from '../../../menu-gallery/presentation/http/menu-gallery.validators';
import { uploadMenuGalleryCsv } from '../../../menu-gallery/presentation/middlewares/upload-gallery-csv.middleware';
import { uploadSingleFile } from '../../../files/presentation/middlewares/upload.middleware';
import { uploadFileQuerySchema } from '../../../files/presentation/http/files.validators';
import {
  listPlatformDemoQuerySchema,
  updateDemoRequestStatusSchema,
} from '../../../demo/presentation/http/demo.validators';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import {
  requirePlatformAuth,
  requirePlatformPermission,
  requireSuperAdmin,
} from '../middlewares/require-platform-auth.middleware';

const platformAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
  },
});

const platformAuthRouter = Router();

platformAuthRouter.post(
  '/login',
  platformAuthRateLimiter,
  validateBody(platformLoginSchema),
  platformAuthController.login,
);
platformAuthRouter.post('/refresh', platformAuthController.refresh);
platformAuthRouter.post('/logout', platformAuthController.logout);
platformAuthRouter.get('/me', requirePlatformAuth, platformAuthController.me);

const platformBusinessRouter = Router();

platformBusinessRouter.get(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformBusinessController.list,
);
platformBusinessRouter.post(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(createBusinessSchema),
  platformBusinessController.create,
);
platformBusinessRouter.get(
  '/:id',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformBusinessController.get,
);
platformBusinessRouter.patch(
  '/:id/subscription',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(updateBusinessSubscriptionSchema),
  platformBusinessController.updateSubscription,
);
platformBusinessRouter.post(
  '/:id/suspend',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  platformBusinessController.suspend,
);
platformBusinessRouter.post(
  '/:id/reactivate',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  platformBusinessController.reactivate,
);
platformBusinessRouter.post(
  '/:id/block-subscription',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  platformBusinessController.blockSubscription,
);
platformBusinessRouter.post(
  '/:id/unblock-subscription',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  platformBusinessController.unblockSubscription,
);
platformBusinessRouter.delete(
  '/:id',
  requirePlatformAuth,
  requireSuperAdmin,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_DELETE),
  platformBusinessController.remove,
);

const platformAdminsRouter = Router();

platformAdminsRouter.get(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.ADMINS_VIEW),
  platformAdminManagementController.list,
);
platformAdminsRouter.post(
  '/',
  requirePlatformAuth,
  requireSuperAdmin,
  requirePlatformPermission(PLATFORM_PERMISSIONS.ADMINS_MANAGE),
  validateBody(createPlatformAdminSchema),
  platformAdminManagementController.create,
);
platformAdminsRouter.patch(
  '/:id',
  requirePlatformAuth,
  requireSuperAdmin,
  requirePlatformPermission(PLATFORM_PERMISSIONS.ADMINS_MANAGE),
  validateBody(updatePlatformAdminSchema),
  platformAdminManagementController.update,
);

const platformMetricsRouter = Router();

platformMetricsRouter.get(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.METRICS_VIEW),
  platformMetricsController.get,
);
platformMetricsRouter.get(
  '/audit-logs',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.AUDIT_VIEW),
  platformMetricsController.auditLogs,
);

const platformTenantAnalyticsRouter = Router();

platformTenantAnalyticsRouter.get(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.METRICS_VIEW),
  validateQuery(platformTenantAnalyticsQuerySchema),
  platformTenantAnalyticsController.list,
);
platformTenantAnalyticsRouter.get(
  '/:businessId',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.METRICS_VIEW),
  validateQuery(platformTenantAnalyticsQuerySchema),
  platformTenantAnalyticsController.detail,
);

const platformBillingRouter = Router();

platformBillingRouter.get(
  '/settings',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  platformBillingController.getSettings,
);
platformBillingRouter.patch(
  '/settings',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(updateBillingSettingsSchema),
  platformBillingController.updateSettings,
);
platformBillingRouter.get(
  '/payments',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformBillingController.listPayments,
);
platformBillingRouter.post(
  '/payments/:id/approve',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(reviewPaymentSchema),
  platformBillingController.approvePayment,
);
platformBillingRouter.post(
  '/payments/:id/reject',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(reviewPaymentSchema),
  platformBillingController.rejectPayment,
);
platformBillingRouter.patch(
  '/businesses/:id/trial',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(setTrialDaysSchema),
  platformBillingController.setTrialDays,
);
platformBillingRouter.post(
  '/businesses/:id/subscription-invoice',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(sendSubscriptionInvoiceSchema),
  platformBillingController.sendSubscriptionInvoice,
);
platformBillingRouter.post(
  '/businesses/:id/purchase-receipt',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(sendPurchaseReceiptSchema),
  platformBillingController.sendPurchaseReceipt,
);
platformBillingRouter.get(
  '/businesses/:id/subscription-invoices',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  platformBillingController.listBusinessSubscriptionInvoices,
);
platformBillingRouter.post(
  '/businesses/:id/subscription-invoices/:invoiceId/dismiss-alert',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(dismissSubscriptionInvoiceSchema),
  platformBillingController.dismissBusinessSubscriptionInvoiceAlert,
);

const platformSettingsRouter = Router();

platformSettingsRouter.get(
  '/',
  requirePlatformAuth,
  platformSettingsController.getSettings,
);
platformSettingsRouter.patch(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(updatePlatformSettingsSchema),
  platformSettingsController.updateSettings,
);

const platformFeedbackRouter = Router();

platformFeedbackRouter.get(
  '/contact',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.FEEDBACK_VIEW),
  platformFeedbackController.getContactSettings,
);
platformFeedbackRouter.patch(
  '/contact',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.FEEDBACK_MANAGE),
  validateBody(updateFeedbackContactSettingsSchema),
  platformFeedbackController.updateContactSettings,
);
platformFeedbackRouter.get(
  '/tickets',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.FEEDBACK_VIEW),
  validateQuery(listPlatformFeedbackQuerySchema),
  platformFeedbackController.listTickets,
);
platformFeedbackRouter.post(
  '/tickets/:id/resolve',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.FEEDBACK_MANAGE),
  validateBody(reviewFeedbackTicketSchema),
  platformFeedbackController.resolveTicket,
);
platformFeedbackRouter.post(
  '/tickets/:id/reject',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.FEEDBACK_MANAGE),
  validateBody(reviewFeedbackTicketSchema),
  platformFeedbackController.rejectTicket,
);

const platformDemoRouter = Router();

platformDemoRouter.get(
  '/requests',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.DEMO_VIEW),
  validateQuery(listPlatformDemoQuerySchema),
  platformDemoController.listRequests,
);
platformDemoRouter.patch(
  '/requests/:id',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.DEMO_MANAGE),
  validateBody(updateDemoRequestStatusSchema),
  platformDemoController.updateStatus,
);

export const platformRouter = Router();

platformRouter.use('/auth', platformAuthRouter);
platformRouter.use('/businesses', platformBusinessRouter);
platformRouter.use('/admins', platformAdminsRouter);
platformRouter.use('/metrics', platformMetricsRouter);
platformRouter.use('/tenant-analytics', platformTenantAnalyticsRouter);
platformRouter.use('/billing', platformBillingRouter);
platformRouter.use('/feedback', platformFeedbackRouter);
platformRouter.use('/demo', platformDemoRouter);
platformRouter.use('/settings', platformSettingsRouter);

const platformMenuGalleryRouter = Router();

platformMenuGalleryRouter.get(
  '/import/sample',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformMenuGalleryController.downloadImportSample,
);
platformMenuGalleryRouter.post(
  '/import',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  uploadMenuGalleryCsv,
  platformMenuGalleryController.importCsv,
);
platformMenuGalleryRouter.post(
  '/import/paste',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(importMenuGalleryCsvPasteSchema),
  platformMenuGalleryController.importCsvPaste,
);
platformMenuGalleryRouter.get(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformMenuGalleryController.list,
);
platformMenuGalleryRouter.post(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(createMenuGalleryImageSchema),
  platformMenuGalleryController.create,
);
platformMenuGalleryRouter.patch(
  '/:id',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(updateMenuGalleryImageSchema),
  platformMenuGalleryController.update,
);
platformMenuGalleryRouter.delete(
  '/:id',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  platformMenuGalleryController.delete,
);
platformMenuGalleryRouter.post(
  '/upload',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateQuery(uploadFileQuerySchema),
  uploadSingleFile,
  platformMenuGalleryController.uploadImage,
);

platformRouter.use('/menu-gallery', platformMenuGalleryRouter);

const platformReceiptRouter = Router();

platformReceiptRouter.get(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformReceiptController.getGlobal,
);
platformReceiptRouter.patch(
  '/',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(updateReceiptTemplateSchema),
  platformReceiptController.updateGlobal,
);
platformReceiptRouter.get(
  '/businesses/:businessId',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformReceiptController.getBusiness,
);
platformReceiptRouter.patch(
  '/businesses/:businessId',
  requirePlatformAuth,
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_MANAGE),
  validateBody(updateBusinessReceiptTemplateSchema),
  platformReceiptController.updateBusiness,
);

platformRouter.use('/receipts', platformReceiptRouter);
