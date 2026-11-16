'use client';

import { Suspense } from 'react';
import { PosOrderScreen } from '@/components/orders/pos-order-screen';
import { OfflinePosBanner } from '@/components/offline/offline-pos-banner';
import { OfflinePosProvider } from '@/components/offline/offline-pos-provider';
import { Spinner } from '@/components/ui';
import { themeToStyle } from '@/lib/theme/theme-css';
import type { Business } from '@/lib/api/types';

type PosNewOrderShellProps = {
  slug: string;
  exitHref: string;
  business?: Business | null;
};

export function PosNewOrderShell({ slug, exitHref, business }: PosNewOrderShellProps) {
  return (
    <OfflinePosProvider slug={slug}>
      <div
        className="h-[100dvh] max-h-[100dvh] w-full min-h-0 flex flex-col overflow-hidden pos-bill-immersive"
        style={themeToStyle(business)}
      >
        <OfflinePosBanner />
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <PosOrderScreen slug={slug} fullScreen exitHref={exitHref} />
        </Suspense>
      </div>
    </OfflinePosProvider>
  );
}