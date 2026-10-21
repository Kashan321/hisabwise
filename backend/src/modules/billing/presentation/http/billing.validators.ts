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

export const submitPaymentSchema = z.object({
  interval: z.enum(['MONTHLY', 'YEARLY']),
  proofImageUrl: storageReferenceSchema,
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
});

export const reviewPaymentSchema = z.object({
  adminNote: z.string().max(2000).optional(),
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
