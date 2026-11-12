import type { AuthUser } from '@/lib/api/types';
import { getLastBusinessSlug, getTenantToken, setTenantToken } from '@/lib/api/auth-session';
import { offlineDb } from '@/lib/offline/db';

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/** Restore cashier session from the offline snapshot when the API cannot be reached. */
export async function loadCachedAuthUserForOffline(expectedSlug?: string): Promise<AuthUser | null> {
  if (!getTenantToken()) return null;

  const slug = expectedSlug ?? getLastBusinessSlug();
  try {
    await offlineDb.open();
    const snapshots = await offlineDb.snapshots.toArray();
    for (const snap of snapshots) {
      if (!snap.authUserJson) continue;
      let user: AuthUser;
      try {
        user = JSON.parse(snap.authUserJson) as AuthUser;
      } catch {
        continue;
      }
      if (slug && user.businessSlug !== slug) continue;
      if (snap.accessToken) setTenantToken(snap.accessToken);
      return user;
    }
  } catch {
    return null;
  }
  return null;
}
