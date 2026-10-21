'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button, Icon, Skeleton } from '@/components/ui';
import { useMarkInboxNotificationRead } from '@/lib/hooks/mutations';
import { useInboxNotification } from '@/lib/hooks/queries';

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const router = useRouter();
  const { data: notification, isLoading } = useInboxNotification(id);
  const markRead = useMarkInboxNotificationRead();

  useEffect(() => {
    if (!notification || notification.isRead) return;
    void markRead.mutateAsync(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark read once when opened
  }, [id, notification?.id, notification?.isRead]);

  const actionHref = notification?.actionHref
    ? notification.actionHref.startsWith('/')
      ? `/${slug}${notification.actionHref}`
      : `/${slug}/${notification.actionHref}`
    : null;

  return (
    <BusinessLayout slug={slug} title="Message">
      <div className="max-w-2xl mx-auto w-full">
        <Link
          href={`/${slug}/notifications`}
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4"
        >
          <Icon name="arrow_back" className="text-base" />
          Inbox
        </Link>

        {isLoading && <Skeleton className="h-64 rounded-xl" />}

        {notification && (
          <article className="rounded-xl border border-outline-variant/25 bg-surface shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-outline-variant/15 bg-surface-container-lowest space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {notification.category.replace('_', ' ')}
              </p>
              <h1 className="font-title-lg text-primary">{notification.title}</h1>
              <p className="text-xs text-on-surface-variant">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </header>
            <div className="px-5 py-6">
              <p className="text-on-surface whitespace-pre-wrap leading-relaxed">{notification.body}</p>
            </div>
            {actionHref && (
              <footer className="px-5 py-4 border-t border-outline-variant/15 bg-surface-container-lowest flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => router.push(actionHref)}
                >
                  {notification.actionLabel ?? 'Open'}
                  <Icon name="open_in_new" className="text-base" />
                </Button>
              </footer>
            )}
          </article>
        )}
      </div>
    </BusinessLayout>
  );
}
