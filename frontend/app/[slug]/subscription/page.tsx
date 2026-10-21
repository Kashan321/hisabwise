'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { useSubscription } from '@/lib/hooks/queries';
import { Button, Icon } from '@/components/ui';
import { SubscriptionPaymentPanel } from '@/components/subscription/subscription-payment-panel';

export default function SubscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { logout } = useAuth();
  const { data: subscription } = useSubscription();

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="border-b border-outline-variant/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display-md text-primary">Subscription</h1>
          <p className="font-caption text-on-surface-variant">
            {subscription?.isLocked ? 'Renew to unlock your account' : 'Manage your plan'}
          </p>
        </div>
        <div className="flex gap-2">
          {!subscription?.isLocked && (
            <Link href={`/${slug}/dashboard`}>
              <Button type="button" variant="ghost" className="cursor-pointer">
                <Icon name="arrow_back" />
                Dashboard
              </Button>
            </Link>
          )}
          <Button type="button" variant="outline" onClick={logout} className="cursor-pointer">
            <Icon name="logout" />
            Log out
          </Button>
        </div>
      </header>

      <main className="p-6">
        <SubscriptionPaymentPanel subscription={subscription} />
      </main>
    </div>
  );
}
