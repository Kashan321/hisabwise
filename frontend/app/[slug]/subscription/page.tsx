'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { SubscriptionOwnerPage } from '@/components/subscription/subscription-owner-page';
import { useAuth } from '@/lib/auth/auth-context';
import { getDefaultRoute, isBusinessOwner } from '@/lib/auth/permissions';
import { useSubscription } from '@/lib/hooks/queries';
import { Button, Icon, Spinner } from '@/components/ui';

export default function SubscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, logout, isReady, isAuthenticated } = useAuth();
  const { data: subscription } = useSubscription();

  useEffect(() => {
    if (isReady && isAuthenticated && user && !isBusinessOwner(user)) {
      router.replace(getDefaultRoute(user, slug));
    }
  }, [isReady, isAuthenticated, user, slug, router]);

  const hardLocked =
    subscription?.isLocked ||
    subscription?.accessPhase === 'locked' ||
    subscription?.accessPhase === 'suspended';

  if (!isReady || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!isBusinessOwner(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (hardLocked) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <header className="border-b border-outline-variant/20 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display-md text-primary">Subscription</h1>
            <p className="font-caption text-on-surface-variant">Renew to unlock your account</p>
          </div>
          <Button type="button" variant="outline" onClick={logout} className="cursor-pointer">
            <Icon name="logout" />
            Log out
          </Button>
        </header>
        <main className="p-6">
          <SubscriptionOwnerPage slug={slug} embedded />
        </main>
      </div>
    );
  }

  return (
    <BusinessLayout slug={slug}>
      <SubscriptionOwnerPage slug={slug} />
    </BusinessLayout>
  );
}
