import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../../shared/currency/country-currency';
import { nullableStorageReferenceSchema } from '../../../../shared/files/storage-reference-schema';

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  location: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  branchNumber: z.string().trim().max(50).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  logoUrl: nullableStorageReferenceSchema.optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).nullable().optional(),
  allowNegativeInventory: z.boolean().optional(),
  orderTicketPrefix: z
    .string()
    .trim()
    .min(1)
    .max(8)
    .regex(/^[A-Za-z0-9]+$/, 'Use letters and numbers only')
    .optional(),
  orderTicketResetDaily: z.boolean().optional(),
  businessDayStartTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:mm format')
    .optional(),
  businessDayTimezone: z.string().trim().min(3).max(64).optional(),
  businessDayAutoCloseEnabled: z.boolean().optional(),
  businessDayCloseReminderEnabled: z.boolean().optional(),
  defaultTaxRate: z.number().min(0).max(1).optional(),
  defaultDeliveryCharge: z.number().min(0).max(1_000_000).optional(),
});

export const detectCurrencySchema = z.object({
  country: z.string().trim().length(2),
});

export type UpdateBusinessBody = z.infer<typeof updateBusinessSchema>;
