'use client';

import { use } from 'react';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { InboxNotificationsList } from '@/components/notifications/inbox-notifications-list';
import { NotificationPreferencesPanel } from '@/components/notifications/notification-preferences-panel';
import { Button, Icon } from '@/components/ui';

export default function NotificationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <BusinessLayout slug={slug} title="Notifications">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display-md text-primary">Notifications</h1>
            <p className="font-caption text-on-surface-variant mt-0.5">
              Messages about orders, reservations, and your business.
            </p>
          </div>
          <Link href={`/${slug}/dashboard`}>
            <Button type="button" variant="ghost">
              <Icon name="arrow_back" />
              Back
            </Button>
          </Link>
        </div>

        <InboxNotificationsList slug={slug} />
        <NotificationPreferencesPanel />
      </div>
    </BusinessLayout>
  );
}
