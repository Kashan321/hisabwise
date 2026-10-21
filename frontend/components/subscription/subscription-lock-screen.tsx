'use client';

import Link from 'next/link';
import { Button, Icon } from '@/components/ui';
import type { TenantSubscription } from '@/lib/api/types';
import { APP_NAME } from '@/lib/config';

export function SubscriptionLockScreen({
  slug,
  subscription,
  onLogout,
}: {
  slug: string;
  subscription?: TenantSubscription;
  onLogout: () => void;
}) {
  const isRenew =
    subscription?.status === 'ACTIVE' ||
    subscription?.status === 'PAST_DUE' ||
    subscription?.hasPendingPayment;

  const title = subscription?.hasPendingPayment
    ? 'Payment under review'
    : subscription?.isSubscriptionBlocked
      ? 'Access blocked by admin'
      : isRenew
        ? 'Subscription required'
        : 'Your free trial has ended';

  const description = subscription?.hasPendingPayment
    ? 'We received your payment proof. Our team will verify it shortly and activate your subscription.'
    : subscription?.isSubscriptionBlocked
      ? 'Your account access has been blocked by the platform administrator. Subscribe to restore access or contact support.'
      : `Subscribe to continue using ${APP_NAME} for orders, kitchen, menu, and reports.`;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-error-container flex items-center justify-center">
          <Icon name="lock" className="text-3xl text-on-error-container" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display-lg text-primary">{title}</h1>
          <p className="font-body-base text-on-surface-variant">{description}</p>
        </div>
        <div className="flex flex-col gap-3">
          {!subscription?.hasPendingPayment && (
            <Link href={`/${slug}/subscription`}>
              <Button variant="primary" className="w-full cursor-pointer">
                <Icon name="payments" />
                {isRenew ? 'Renew subscription' : 'Buy subscription'}
              </Button>
            </Link>
          )}
          <Button type="button" variant="outline" onClick={onLogout} className="w-full cursor-pointer">
            <Icon name="logout" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
