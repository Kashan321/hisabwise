'use client';

import { use, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PosNewOrderShell } from '@/components/orders/pos-new-order-shell';
import { SubscriptionLockScreen } from '@/components/subscription/subscription-lock-screen';
import { Spinner } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
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
import { isBrowserOffline } from '@/lib/offline/session';
import { warmPosShellCache, startPosRscCapture } from '@/lib/offline/warm-pos-cache';
import { hydrateTenantQueriesFromSnapshot } from '@/lib/offline/hydrate-tenant-queries';
import { offlineScopeKey } from '@/lib/offline/db';

export default function NewOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
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
    if (!isReady || !isAuthenticated || !user?.businessId || !user.id) return;
    const scopeKey = offlineScopeKey(user.businessId, user.id);
  void hydrateTenantQueriesFromSnapshot(queryClient, scopeKey);
  }, [isAuthenticated, isReady, queryClient, user]);

  useEffect(() => {
    if (isReady && pathname.includes('/orders/new') && isAuthenticated) {
      void warmPosShellCache(pathname, window.location.href);
      if (navigator.onLine) router.prefetch(pathname);
      const stop = startPosRscCapture(slug);
      return stop;
    }
  }, [isAuthenticated, isReady, pathname, router, slug]);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      if (isBrowserOffline()) return;
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

  return <PosNewOrderShell slug={slug} exitHref={exitHref} business={business} />;
}
