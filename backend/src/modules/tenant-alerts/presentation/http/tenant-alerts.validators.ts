import { z } from 'zod';
import { isValidCalendarDateString } from '../../../../shared/time/calendar-date';

const calendarDate = z
  .string()
  .trim()
  .refine(isValidCalendarDateString, 'Use a valid date (YYYY-MM-DD)');

const optionalHttpUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), 'Link must be a valid http(s) URL');

const alertBodySchema = z.object({
  bodyText: z.string().trim().min(1).max(5000),
  linkUrl: optionalHttpUrl,
  linkLabel: z.string().trim().max(120).optional().nullable(),
  imageUrl: optionalHttpUrl,
  startDate: calendarDate,
  endDate: calendarDate,
  isActive: z.boolean(),
});

export const createPlatformTenantAlertSchema = alertBodySchema;

export const updatePlatformTenantAlertSchema = alertBodySchema.partial();

export type CreatePlatformTenantAlertBody = z.infer<typeof createPlatformTenantAlertSchema>;
export type UpdatePlatformTenantAlertBody = z.infer<typeof updatePlatformTenantAlertSchema>;
