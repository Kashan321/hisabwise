import type { InboxNotificationCategory, Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { logger } from '../../../../shared/logger/logger';

export type CreateInboxNotificationInput = {
  businessId: string;
  userId: string;
  category: InboxNotificationCategory;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionHref?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createInboxNotification(input: CreateInboxNotificationInput) {
  const row = await prisma.userInboxNotification.create({
    data: {
      businessId: input.businessId,
      userId: input.userId,
      category: input.category,
      title: input.title,
      body: input.body,
      actionLabel: input.actionLabel?.trim() || null,
      actionHref: input.actionHref?.trim() || null,
      metadata: input.metadata ?? undefined,
    },
  });

  try {
    emitDomainEvent('inbox.notification_created', {
      businessId: input.businessId,
      userId: input.userId,
      notificationId: row.id,
      category: row.category,
      title: row.title,
      body: row.body,
      actionHref: row.actionHref,
    });
  } catch (error) {
    // Inbox row is saved even if realtime emit fails
    logger.error({ err: error }, 'inbox.notification_created emit failed');
  }

  return row;
}

export async function createInboxNotificationsForUsers(
  userIds: string[],
  input: Omit<CreateInboxNotificationInput, 'userId'>,
) {
  const unique = [...new Set(userIds)];
  const results = [];
  for (const userId of unique) {
    results.push(await createInboxNotification({ ...input, userId }));
  }
  return results;
}
