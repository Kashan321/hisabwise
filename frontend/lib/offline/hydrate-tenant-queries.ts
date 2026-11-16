import type { QueryClient } from '@tanstack/react-query';
import { readOfflineSnapshot } from '@/lib/offline/snapshot';

/** Seed React Query from IndexedDB so POS renders without network after hard reload. */
export async function hydrateTenantQueriesFromSnapshot(
  queryClient: QueryClient,
  scopeKey: string,
): Promise<boolean> {
  const snapshot = await readOfflineSnapshot(scopeKey);
  if (!snapshot?.business) return false;

  queryClient.setQueryData(['business', 'me'], snapshot.business);
  queryClient.setQueryData(['menu'], {
    menu: snapshot.menu ?? [],
    inventoryAvailability: { menuItems: {}, variants: {}, modifierOptions: {} },
  });
  return true;
}