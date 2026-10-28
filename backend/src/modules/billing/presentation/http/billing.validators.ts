import { z } from 'zod';
import { storageReferenceSchema } from '../../../files/presentation/http/files.validators';

export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z
    .object({
      businessId: z.string().uuid().optional(),
    })
    .optional(),
});

export const submitPaymentSchema = z
  .object({
    durationMonths: z.coerce.number().int().refine((n) => [1, 3, 6, 9, 12].includes(n)).optional(),
    interval: z.enum(['MONTHLY', 'YEARLY']).optional(),
    amount: z.coerce.number().min(0),
    proofImageUrl: storageReferenceSchema,
    transactionReference: z.string().max(200).optional(),
  })
  .refine((data) => data.durationMonths != null || data.interval != null, {
    message: 'Provide durationMonths (1, 3, 6, 9, 12) or legacy interval',
  });

export const updateBillingSettingsSchema = z.object({
  defaultTrialDays: z.coerce.number().int().min(1).max(365).optional(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  yearlyPrice: z.coerce.number().min(0).optional(),
  currency: z.string().min(1).max(10).optional(),
  bankName: z.string().max(200).nullable().optional(),
  accountTitle: z.string().max(200).nullable().optional(),
  accountNumber: z.string().max(100).nullable().optional(),
  iban: z.string().max(100).nullable().optional(),
  swiftCode: z.string().max(50).nullable().optional(),
  paymentInstructions: z.string().max(5000).nullable().optional(),
  gracePeriodDays: z.coerce.number().int().min(0).max(30).optional(),
  readOnlyPeriodDays: z.coerce.number().int().min(0).max(90).optional(),
});

export const adminRenewSubscriptionSchema = z.object({
  durationMonths: z.coerce.number().int().refine((n) => [1, 3, 6, 9, 12].includes(n)),
  customDays: z.coerce.number().int().min(1).max(730).optional(),
  discountType: z.enum(['PERCENT', 'FIXED']).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  overrideFinalAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.string().max(50).optional(),
  paymentReference: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
  sendInvoice: z.boolean().optional(),
  idempotencyKey: z.string().max(100).optional(),
  finalAmount: z.coerce.number().min(0).optional(),
});

export const extendAccessDaysSchema = z.object({
  days: z.coerce.number().int().min(1).max(365),
});

export const reviewPaymentSchema = z.object({
  adminNote: z.string().max(2000).optional(),
  durationMonths: z.coerce
    .number()
    .int()
    .refine((n) => [1, 3, 6, 9, 12].includes(n))
    .optional(),
  overrideFinalAmount: z.coerce.number().min(0).optional(),
});

export const updateBusinessCustomMonthlyPriceSchema = z.object({
  customMonthlyPrice: z.coerce.number().min(0).nullable(),
});

export const setTrialDaysSchema = z.object({
  trialDays: z.coerce.number().int().min(1).max(365),
});

export const sendSubscriptionInvoiceSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    interval: z.enum(['MONTHLY', 'YEARLY']).optional(),
    dueInDays: z.coerce.number().int().min(1).max(365),
    alertDays: z.coerce.number().int().min(1).max(90),
    note: z.string().max(2000).optional(),
  })
  .refine((data) => data.amount != null || data.interval != null, {
    message: 'Provide amount or billing interval (paid tenants can omit interval if they have a plan on file)',
  });

export const sendPurchaseReceiptSchema = z.object({
  paymentSubmissionId: z.string().uuid().optional(),
  note: z.string().max(2000).optional(),
  /** Days to show the tenant dashboard banner (0 = PDF only, no banner). */
  alertDays: z.coerce.number().int().min(0).max(90).optional(),
});

export const dismissSubscriptionInvoiceSchema = z.object({}).default({});

export const dismissInvoiceAlertBodySchema = z.object({
  invoiceId: z.string().uuid(),
});
