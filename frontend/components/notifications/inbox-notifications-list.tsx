'use client';

import Link from 'next/link';
import { Button, Icon, Skeleton } from '@/components/ui';
import type { InboxNotification } from '@/lib/api/types';
import { useCreateInboxSelfTest, useMarkAllInboxNotificationsRead } from '@/lib/hooks/mutations';
import { useInboxNotifications } from '@/lib/hooks/queries';
import { formatApiError } from '@/lib/api/errors';
import { API_BASE_URL } from '@/lib/config';
import { useToast } from '@/lib/toast';

function categoryIcon(category: InboxNotification['category']): string {
  switch (category) {
    case 'ORDER':
      return 'receipt_long';
    case 'KITCHEN':
      return 'restaurant';
    case 'RESERVATION':
      return 'event';
    case 'DELIVERY':
      return 'delivery_dining';
    case 'BILLING':
      return 'payments';
    case 'INVENTORY':
      return 'inventory_2';
    case 'PROMOTION':
      return 'local_offer';
    default:
      return 'notifications';
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function InboxNotificationsList({ slug }: { slug: string }) {
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useInboxNotifications();
  const markAll = useMarkAllInboxNotificationsRead();
  const selfTest = useCreateInboxSelfTest();
  const items = data?.notifications ?? [];

  return (
    <div className="flex flex-col min-h-0 rounded-xl border border-outline-variant/25 bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest">
        <p className="font-body-emphasis text-primary">
          Inbox
          {data?.unreadCount ? (
            <span className="ml-2 text-xs font-normal text-on-surface-variant">
              {data.unreadCount} unread
            </span>
          ) : null}
        </p>
        <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          className="text-sm"
          loading={selfTest.isPending}
          onClick={async () => {
            try {
              await selfTest.mutateAsync();
              toast.success('Test notification sent');
            } catch (err) {
              toast.error(formatApiError(err));
            }
          }}
        >
          Send test
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-sm"
          disabled={!data?.unreadCount || markAll.isPending}
          loading={markAll.isPending}
          onClick={async () => {
            try {
              await markAll.mutateAsync();
              toast.success('All marked as read');
            } catch (err) {
              toast.error(formatApiError(err));
            }
          }}
        >
          Mark all read
        </Button>
        </div>
      </div>

      {isError && (
        <div className="p-4 m-4 rounded-lg border border-error/30 bg-error-container/20 text-sm space-y-2">
          <p className="font-medium text-error">Could not load notifications</p>
          <p className="text-on-surface-variant">{formatApiError(error)}</p>
          <p className="text-on-surface-variant text-xs break-all">
            API base: <code className="text-xs">{API_BASE_URL}</code>
          </p>
          <p className="text-on-surface-variant text-xs">
            On the server: deploy latest <code className="text-xs">main</code>, run{' '}
            <code className="text-xs">npx prisma migrate deploy</code> in{' '}
            <code className="text-xs">backend/</code>, then{' '}
            <code className="text-xs">pm2 reload venta-backend</code>. Rebuild the frontend if you
            change <code className="text-xs">NEXT_PUBLIC_API_URL</code>.
          </p>
          <Button type="button" variant="outline" className="text-sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-outline-variant/15">
        {isLoading && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="p-8 md:p-12 text-center text-on-surface-variant space-y-3">
            <Icon name="inbox" className="text-4xl opacity-40 mx-auto" />
            <p className="font-body-emphasis text-on-surface">No notifications yet</p>
            <p className="text-sm max-w-md mx-auto">
              Use <span className="font-medium text-on-surface">Send test</span> above to confirm the
              inbox is connected. Real alerts appear when an order is{' '}
              <span className="font-medium text-on-surface">punched or sent to kitchen</span> (held
              drafts do not notify until you send them).
            </p>
            <p className="text-xs max-w-md mx-auto">
              Desktop pop-ups are optional — enable them in Browser notifications below. The bell and
              this list work without browser permission.
            </p>
          </div>
        )}

        {items.map((item) => (
          <Link
            key={item.id}
            href={`/${slug}/notifications/${item.id}`}
            className={`flex gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors ${
              !item.isRead ? 'bg-primary-container/15' : ''
            }`}
          >
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                item.isRead ? 'bg-surface-container-low' : 'bg-primary/15 text-primary'
              }`}
            >
              <Icon name={categoryIcon(item.category)} className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`truncate ${item.isRead ? 'font-medium' : 'font-bold'} text-on-surface`}>
                  {item.title}
                </p>
                <span className="text-xs text-on-surface-variant shrink-0">{formatWhen(item.createdAt)}</span>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-2 mt-0.5">{item.body}</p>
            </div>
            {!item.isRead && (
              <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2" aria-hidden />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
