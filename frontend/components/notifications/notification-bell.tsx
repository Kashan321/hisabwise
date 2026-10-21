'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useInboxNotifications } from '@/lib/hooks/queries';

export function NotificationBell({ slug }: { slug: string }) {
  const { data } = useInboxNotifications();
  const unread = data?.unreadCount ?? 0;

  return (
    <Link
      href={`/${slug}/notifications`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
      aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
    >
      <Icon name="notifications" className="text-xl" />
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-error text-[10px] font-bold text-white flex items-center justify-center"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
