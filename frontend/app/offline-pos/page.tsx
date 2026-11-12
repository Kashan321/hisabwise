'use client';

import { useEffect, useState } from 'react';
import { PosOrderScreen } from '@/components/orders/pos-order-screen';
import { OfflinePosBanner } from '@/components/offline/offline-pos-banner';
import { OfflinePosProvider } from '@/components/offline/offline-pos-provider';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { getPosBillExitRoute } from '@/lib/auth/permissions';
import { getLastBusinessSlug } from '@/lib/api/auth-session';
import { warmPosShellCache } from '@/lib/offline/warm-pos-cache';

/** Static POS shell — precached for offline hard reload when App Router RSC cannot be served. */
export default function OfflinePosShellPage() {
  const { user, isReady, isAuthenticated } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    setSlug(getLastBusinessSlug());
  }, []);

  useEffect(() => {
    if (!slug || !isAuthenticated) return;
    void warmPosShellCache(`/${slug}/orders/new`);
  }, [isAuthenticated, slug]);

  if (!slug || !isReady) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display-md text-primary">POS session unavailable</p>
        <p className="font-body-base text-on-surface-variant">
          Sign in once while online on this device, then offline mode will restore your cashier session.
        </p>
      </main>
    );
  }

  const exitHref = getPosBillExitRoute(user, slug);

  return (
    <OfflinePosProvider slug={slug}>
      <div className="h-[100dvh] max-h-[100dvh] flex min-h-0 w-full flex-col overflow-hidden pos-bill-immersive">
        <OfflinePosBanner />
        <PosOrderScreen slug={slug} fullScreen exitHref={exitHref} />
      </div>
    </OfflinePosProvider>
  );
}
