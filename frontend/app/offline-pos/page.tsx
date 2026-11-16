'use client';

import { Suspense, useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PosNewOrderShell } from '@/components/orders/pos-new-order-shell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { getPosBillExitRoute, canAccessTenantRoute } from '@/lib/auth/permissions';
import { getLastBusinessSlug } from '@/lib/api/auth-session';
import { warmPosShellCache, startPosRscCapture } from '@/lib/offline/warm-pos-cache';
import { isBrowserOffline } from '@/lib/offline/session';
import { useBusiness } from '@/lib/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { offlineScopeKey } from '@/lib/offline/db';
import { hydrateTenantQueriesFromSnapshot } from '@/lib/offline/hydrate-tenant-queries';
import { rememberLastPosUrl } from '@/lib/offline/pos-shell-storage';

function OfflinePosResolved({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isReady } = useAuth();
  const { data: business } = useBusiness();
  const pathname = `/${slug}/orders/new`;

  const tenantReady =
    isReady && isAuthenticated && canAccessTenantRoute(user, slug, pathname);

  useLayoutEffect(() => {
    rememberLastPosUrl(pathname);
    const visiblePath = `/${slug}/orders/new`;
    if (window.location.pathname !== visiblePath) {
      window.history.replaceState(null, '', visiblePath);
    }
  }, [slug, pathname]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user?.businessId || !user?.id) return;
    const scopeKey = offlineScopeKey(user.businessId, user.id);
    void hydrateTenantQueriesFromSnapshot(queryClient, scopeKey);
  }, [isAuthenticated, isReady, queryClient, user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void warmPosShellCache(pathname, window.location.href);
    const stop = startPosRscCapture(slug);
    return stop;
  }, [isAuthenticated, pathname, slug]);

  if (!isReady) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isBrowserOffline()) {
      return (
        <main className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display-md text-primary">POS session unavailable</p>
          <p className="font-body-base text-on-surface-variant">
            Sign in once while online on this device, then offline mode will restore your cashier
            session.
          </p>
        </main>
      );
    }
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!tenantReady) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const exitHref = getPosBillExitRoute(user, slug);
  return <PosNewOrderShell slug={slug} exitHref={exitHref} business={business} />;
}

function OfflinePosPageInner() {
  const search = useSearchParams();
  const slug = search.get('slug') ?? getLastBusinessSlug();
  if (!slug) {
    return (
      <main className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display-md text-primary">POS not ready</p>
        <p className="font-body-base text-on-surface-variant">
          Open New Order once while online, then retry offline.
        </p>
      </main>
    );
  }
  return <OfflinePosResolved slug={slug} />;
}

export default function OfflinePosShellPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <OfflinePosPageInner />
    </Suspense>
  );
}