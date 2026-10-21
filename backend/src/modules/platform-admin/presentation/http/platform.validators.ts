import { z } from 'zod';
import { businessThemeSchema } from '../../../../shared/branding/default-theme';
import {
  receiptTemplateOverrideSchema,
  receiptTemplateSchema,
} from '../../../../shared/receipt/receipt-template';

export const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createPlatformAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'PLATFORM_ADMIN']),
});

export const updatePlatformAdminSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    role: z.enum(['SUPER_ADMIN', 'PLATFORM_ADMIN']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const updateBusinessSubscriptionSchema = z.object({
  subscriptionStatus: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL']),
});

export const createBusinessSchema = z
  .object({
    businessName: z.string().min(2).max(100),
    businessSlug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
    ownerName: z.string().min(2).max(100),
    ownerEmail: z.string().email(),
    ownerPassword: z.string().min(8),
    subscriptionStatus: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL']).optional(),
    trialDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .merge(businessThemeSchema);

export const updateReceiptTemplateSchema = receiptTemplateSchema;

export const updateBusinessReceiptTemplateSchema = z.object({
  override: receiptTemplateOverrideSchema.nullable(),
});

const platformDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

export const platformTenantAnalyticsQuerySchema = z.object({
  from: platformDateSchema,
  to: platformDateSchema,
});

export const updatePlatformSettingsSchema = businessThemeSchema
  .extend({
    calendlyUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
