import type { InboxNotificationCategory } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';

function mapRow(row: {
  id: string;
  businessId: string;
  userId: string;
  category: InboxNotificationCategory;
  title: string;
  body: string;
  actionLabel: string | null;
  actionHref: string | null;
  metadata: unknown;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    userId: row.userId,
    category: row.category,
    title: row.title,
    body: row.body,
    actionLabel: row.actionLabel,
    actionHref: row.actionHref,
    metadata: row.metadata,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    isRead: row.readAt != null,
  };
}

export class InboxNotificationService {
  async listForUser(
    businessId: string,
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; cursor?: string },
  ) {
    const limit = Math.min(100, Math.max(1, options?.limit ?? 40));
    const rows = await prisma.userInboxNotification.findMany({
      where: {
        businessId,
        userId,
        ...(options?.unreadOnly ? { readAt: null } : {}),
        ...(options?.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const unreadCount = await prisma.userInboxNotification.count({
      where: { businessId, userId, readAt: null },
    });

    return {
      notifications: slice.map(mapRow),
      unreadCount,
      nextCursor: hasMore ? slice[slice.length - 1]?.createdAt.toISOString() : null,
    };
  }

  async getForUser(businessId: string, userId: string, id: string) {
    const row = await prisma.userInboxNotification.findFirst({
      where: { id, businessId, userId },
    });
    if (!row) return null;
    return mapRow(row);
  }

  async markRead(businessId: string, userId: string, id: string) {
    const row = await prisma.userInboxNotification.findFirst({
      where: { id, businessId, userId },
    });
    if (!row) return null;
    if (!row.readAt) {
      await prisma.userInboxNotification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
    return this.getForUser(businessId, userId, id);
  }

  async markAllRead(businessId: string, userId: string) {
    await prisma.userInboxNotification.updateMany({
      where: { businessId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async getPreferences(businessId: string, userId: string) {
    const pref = await prisma.userNotificationPreference.findUnique({
      where: { userId },
    });
    if (!pref || pref.businessId !== businessId) {
      return {
        browserEnabled: false,
        browserCategories: null as InboxNotificationCategory[] | null,
      };
    }
    const categories = pref.browserCategories as InboxNotificationCategory[] | null;
    return {
      browserEnabled: pref.browserEnabled,
      browserCategories: categories,
    };
  }

  async updatePreferences(
    businessId: string,
    userId: string,
    input: {
      browserEnabled?: boolean;
      browserCategories?: InboxNotificationCategory[] | null;
    },
  ) {
    const pref = await prisma.userNotificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        businessId,
        browserEnabled: input.browserEnabled ?? false,
        browserCategories: input.browserCategories ?? undefined,
      },
      update: {
        businessId,
        ...(input.browserEnabled != null ? { browserEnabled: input.browserEnabled } : {}),
        ...(input.browserCategories !== undefined
          ? { browserCategories: input.browserCategories ?? undefined }
          : {}),
      },
    });
    return {
      browserEnabled: pref.browserEnabled,
      browserCategories: (pref.browserCategories as InboxNotificationCategory[] | null) ?? null,
    };
  }
}

export const inboxNotificationService = new InboxNotificationService();
