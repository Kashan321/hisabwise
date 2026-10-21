'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import type { InboxNotificationCategory, NotificationPreferences } from '@/lib/api/types';
import {
  shouldShowBrowserNotification,
  showBrowserNotification,
} from '@/lib/browser-notifications';
import { useNotificationPreferences } from '@/lib/hooks/queries';
import { subscribeTenantRealtime } from '@/lib/realtime/tenant-realtime-client';

export function InboxRealtimeBridge({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  useNotificationPreferences();

  useEffect(() => {
    const currentUserId = user?.id;
    return subscribeTenantRealtime((message) => {
      if (message.type !== 'tenant.event' || message.event !== 'inbox.notification_created') {
        return;
      }

      const payload = message.payload ?? {};
      const targetUserId = String(payload.userId ?? '');
      if (currentUserId && targetUserId && targetUserId !== currentUserId) {
        return;
      }

      void qc.invalidateQueries({ queryKey: ['notifications'] });

      const notificationId = String(payload.notificationId ?? '');
      const title = String(payload.title ?? '');
      const body = String(payload.body ?? '');
      const category = (payload.category ?? 'SYSTEM') as InboxNotificationCategory;
      const actionHref = payload.actionHref ? String(payload.actionHref) : null;

      if (!title || !notificationId) return;

      const prefs = qc.getQueryData<NotificationPreferences>(['notifications', 'preferences']);
      if (!prefs || !shouldShowBrowserNotification({ category }, prefs)) return;

      const href = actionHref
        ? actionHref.startsWith('/')
          ? `/${slug}${actionHref}`
          : `/${slug}/${actionHref}`
        : `/${slug}/notifications/${notificationId}`;

      showBrowserNotification({ id: notificationId, title, body }, () => router.push(href));
    });
  }, [qc, router, slug, user?.id]);

  return null;
}
