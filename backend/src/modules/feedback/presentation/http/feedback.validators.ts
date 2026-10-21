import { z } from 'zod';

export const createFeedbackTicketSchema = z.object({
  type: z.enum(['FEEDBACK', 'BUG_REPORT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(1).max(8000),
  imageKey: z.string().trim().max(500).optional().nullable(),
});

export const listPlatformFeedbackQuerySchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'REJECTED']).optional(),
  businessId: z.string().uuid().optional(),
});

export const reviewFeedbackTicketSchema = z.object({
  adminNote: z.string().trim().max(2000).optional().nullable(),
});

export const updateFeedbackContactSettingsSchema = z.object({
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Invalid email address',
    }),
  phone: z.string().trim().max(50).optional().nullable(),
  whatsapp: z.string().trim().max(50).optional().nullable(),
  websiteUrl: z.string().trim().max(300).optional().nullable(),
  supportHours: z.string().trim().max(1000).optional().nullable(),
  extraNote: z.string().trim().max(2000).optional().nullable(),
});
