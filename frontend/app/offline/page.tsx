'use client';

import { useEffect, useState } from 'react';
import { readLastPosUrl } from '@/lib/offline/pos-shell-storage';

export default function OfflineFallbackPage() {
  const [lastPosUrl, setLastPosUrl] = useState<string | null>(null);

  useEffect(() => {
    const last = readLastPosUrl();
    setLastPosUrl(last);
    const fallback = last ?? '/offline-pos';
    window.location.replace(fallback);
    const timer = window.setTimeout(() => {
      if (window.location.pathname === '/offline' && last) {
        window.location.replace('/offline-pos');
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surface px-6 text-center text-on-surface">
      <p className="font-display-md text-primary">You&apos;re offline</p>
      <p className="max-w-md font-body-base text-on-surface-variant">
        {lastPosUrl
          ? 'Opening your last POS screen from cache…'
          : 'Open New Order once while online on this device, then you can reload offline.'}
      </p>
      {lastPosUrl ? (
        <a
          href={lastPosUrl}
          className="rounded-lg bg-primary px-4 py-2 font-body-emphasis text-on-primary"
        >
          Open POS (New Order)
        </a>
      ) : null}
    </main>
  );
}
