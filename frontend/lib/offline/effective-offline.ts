import type { ApiReachability } from '@/lib/offline/connectivity';

/** True when POS should queue orders locally instead of calling the API. */
export function isPosEffectivelyOffline(input: {
  apiReachability: ApiReachability;
  browserOnline: boolean;
}): boolean {
  if (!input.browserOnline) return true;
  // Do not block checkout while heartbeat is still "checking" — treat as offline until API is proven up.
  if (input.apiReachability !== 'online') return true;
  return false;
}

export function isNetworkFailureError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed') ||
      msg.includes('networkerror')
    );
  }
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
