import { z } from 'zod';

const channelEnum = z.enum(['EMAIL', 'SMS']);
const statusEnum = z.enum(['PENDING', 'SENT', 'FAILED']);

export const listNotificationLogsQuerySchema = z.object({
  channel: channelEnum.optional(),
  status: statusEnum.optional(),
});

const inboxCategoryEnum = z.enum([
  'ORDER',
  'KITCHEN',
  'RESERVATION',
  'BILLING',
  'INVENTORY',
  'DELIVERY',
  'SYSTEM',
  'PROMOTION',
]);

export const listInboxNotificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  browserEnabled: z.boolean().optional(),
  browserCategories: z.array(inboxCategoryEnum).nullable().optional(),
});
