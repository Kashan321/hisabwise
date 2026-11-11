import { apiFetch } from '@/lib/api/client';
import type { AuthUser, Business, MenuCategory } from '@/lib/api/types';
import { getTenantToken } from '@/lib/api/client';
import { offlineDb, offlineScopeKey, type OfflineSnapshotRecord } from '@/lib/offline/db';

export type OfflineSnapshot = {
  generatedAt: string;
  business: Business;
  menu: MenuCategory[];
  businessDay: OfflineSnapshotRecord['businessDay'];
};

export async function fetchAndStoreOfflineSnapshot(businessId: string, userId: string, user?: AuthUser) {
  const { snapshot } = await apiFetch<{ snapshot: OfflineSnapshot }>('/pos/offline-snapshot');
  const scopeKey = offlineScopeKey(businessId, userId);
  const record: OfflineSnapshotRecord = {
    scopeKey,
    businessId,
    userId,
    generatedAt: snapshot.generatedAt,
    business: snapshot.business,
    menu: snapshot.menu,
    businessDay: snapshot.businessDay,
    authUserJson: user ? JSON.stringify(user) : undefined,
    accessToken: getTenantToken() ?? undefined,
  };
  await offlineDb.snapshots.put(record);
  return record;
}

export async function readOfflineSnapshot(scopeKey: string) {
  return offlineDb.snapshots.get(scopeKey);
}

export async function requestOfflineStoragePersistence() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return navigator.storage.persist();
  } catch {
    return false;
  }
}
