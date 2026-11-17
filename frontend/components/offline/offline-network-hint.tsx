'use client';

import { isPosEffectivelyOffline } from '@/lib/offline/effective-offline';
import { getApiReachability } from '@/lib/offline/connectivity';

export function OfflineNetworkHint({ children }: { children?: React.ReactNode }) {
  const offline = isPosEffectivelyOffline({
    apiReachability: getApiReachability(),
    browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });
  if (!offline) return null;
  return (
    <p className="rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface-variant" role="status">
      {children ?? 'You are offline. Showing data cached on this device; some actions sync when you reconnect.'}
    </p>
  );
}