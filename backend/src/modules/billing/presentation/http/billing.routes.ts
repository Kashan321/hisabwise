import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { billingController } from './billing.controller';
import {
  dismissInvoiceAlertBodySchema,
  dismissSubscriptionInvoiceSchema,
  stripeWebhookSchema,
  submitPaymentSchema,
} from './billing.validators';

export const billingRouter = Router();

billingRouter.get('/subscription', requireAuth, billingController.getSubscription);

billingRouter.post(
  '/subscription/dismiss-invoice-alert',
  requireAuth,
  validateBody(dismissInvoiceAlertBodySchema),
  billingController.dismissSubscriptionInvoiceAlertByBody,
);

billingRouter.get(
  '/subscription-invoices/:id',
  requireAuth,
  requirePermission('business.manage'),
  billingController.getSubscriptionInvoice,
);

billingRouter.post(
  '/subscription-invoices/:id/dismiss-alert',
  requireAuth,
  validateBody(dismissSubscriptionInvoiceSchema),
  billingController.dismissSubscriptionInvoiceAlert,
);

billingRouter.get(
  '/payment-instructions',
  requireAuth,
  billingController.getPaymentInstructions,
);

billingRouter.get(
  '/payment-submissions',
  requireAuth,
  requirePermission('business.manage'),
  billingController.listMySubmissions,
);

billingRouter.post(
  '/payment-submissions',
  requireAuth,
  requirePermission('business.manage'),
  validateBody(submitPaymentSchema),
  billingController.submitPayment,
);

billingRouter.post(
  '/webhooks/stripe',
  validateBody(stripeWebhookSchema),
  billingController.stripeWebhook,
);
