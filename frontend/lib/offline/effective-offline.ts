import type { ApiReachability } from '@/lib/offline/connectivity';

/** True when POS should queue orders locally instead of calling the API. */
export function isPosEffectivelyOffline(input: {
  apiReachability: ApiReachability;
  browserOnline: boolean;
}): boolean {
  if (!input.browserOnline) return true;
  if (input.apiReachability === 'offline') return true;
  return false;
}

export function offlineCheckoutBannerMessage(effectivelyOffline: boolean, pendingCount: number) {
  if (!effectivelyOffline) return null;
  const queue =
    pendingCount > 0
      ? `${pendingCount} order${pendingCount === 1 ? '' : 's'} waiting to sync.`
      : 'Cash sales are saved on this device until you reconnect.';
  return `Offline mode — ${queue}`;
}
