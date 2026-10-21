'use client';

import { Suspense, use, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PosOrderScreen } from '@/components/orders/pos-order-screen';
import { SubscriptionLockScreen } from '@/components/subscription/subscription-lock-screen';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import {
  canAccessTenantRoute,
  getDefaultRoute,
  getPosBillExitRoute,
  isChefOnly,
  isRiderOnly,
  isWaiterOnly,
} from '@/lib/auth/permissions';
import { useBusiness, useSubscription } from '@/lib/hooks/queries';
import { usePrefetchTenantShell } from '@/lib/hooks/prefetch-tenant-shell';
import { useAutoDetectCurrency } from '@/lib/hooks/use-auto-detect-currency';
import { themeToStyle } from '@/lib/theme/theme-css';
import { resolveTenantPageTitle } from '@/lib/document-title';
import { useTenantDocumentTitle } from '@/lib/hooks/use-document-title';

function NewBillContent({ slug, exitHref }: { slug: string; exitHref: string }) {
  return <PosOrderScreen slug={slug} fullScreen exitHref={exitHref} />;
}

export default function NewOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isReady } = useAuth();
  const { data: business } = useBusiness();
  const { data: subscription } = useSubscription();

  useAutoDetectCurrency();
  usePrefetchTenantShell(
    isReady && isAuthenticated && user?.businessSlug === slug,
    user,
  );

  const tenantReady =
    isReady && isAuthenticated && canAccessTenantRoute(user, slug, pathname);
  const exitHref = getPosBillExitRoute(user, slug);
  const pageTitle = resolveTenantPageTitle(slug, pathname);
  const branchName = business?.name ?? slug.replace(/-/g, ' ');
  useTenantDocumentTitle(pageTitle, branchName);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isReady || !isAuthenticated || !user) return;
    if (user.businessSlug !== slug) {
      router.replace(getDefaultRoute(user, user.businessSlug));
      return;
    }
    if (isWaiterOnly(user)) {
      router.replace(`/${slug}/waiter`);
      return;
    }
    if (isRiderOnly(user)) {
      router.replace(`/${slug}/rider`);
      return;
    }
    if (isChefOnly(user)) {
      router.replace(`/${slug}/kitchen`);
      return;
    }
    if (!canAccessTenantRoute(user, slug, pathname)) {
      router.replace(getDefaultRoute(user, slug));
    }
  }, [isReady, isAuthenticated, user, router, slug, pathname]);

  if (!tenantReady) {
    return (
      <div
        className="h-[100dvh] flex items-center justify-center pos-bill-immersive"
        style={themeToStyle(business)}
      >
        <Spinner />
      </div>
    );
  }

  if (subscription?.isLocked && !pathname.includes('/subscription')) {
    return (
      <SubscriptionLockScreen slug={slug} subscription={subscription} onLogout={logout} />
    );
  }

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] w-full min-h-0 flex flex-col overflow-hidden pos-bill-immersive"
      style={themeToStyle(business)}
    >
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <NewBillContent slug={slug} exitHref={exitHref} />
      </Suspense>
    </div>
  );
}
