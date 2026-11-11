'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/auth-context';
import { offlineDb, offlineScopeKey } from '@/lib/offline/db';
import {
  getApiReachability,
  pingApiHealth,
  startApiHeartbeat,
  subscribeApiReachability,
  type ApiReachability,
} from '@/lib/offline/connectivity';
import {
  fetchAndStoreOfflineSnapshot,
  readOfflineSnapshot,
  requestOfflineStoragePersistence,
} from '@/lib/offline/snapshot';
import { ensurePosDeviceRegistered } from '@/lib/offline/device';
import {
  countPendingOfflineOrders,
  syncPendingOfflineOrders,
  listPendingOfflineOrders,
} from '@/lib/offline/sync';
import type { PendingOfflineOrderRecord } from '@/lib/offline/db';

interface OfflinePosContextValue {
  apiReachability: ApiReachability;
  isOfflineMode: boolean;
  pendingCount: number;
  pendingOrders: PendingOfflineOrderRecord[];
  refreshSnapshot: () => Promise<void>;
  syncNow: () => Promise<void>;
  scopeKey: string | null;
}

const OfflinePosContext = createContext<OfflinePosContextValue | null>(null);

export function OfflinePosProvider({ children, slug }: { children: ReactNode; slug: string }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [apiReachability, setApiReachability] = useState<ApiReachability>(getApiReachability());
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<PendingOfflineOrderRecord[]>([]);

  const scopeKey = useMemo(() => {
    if (!user?.businessId || !user?.id) return null;
    return offlineScopeKey(user.businessId, user.id);
  }, [user?.businessId, user?.id]);

  const refreshPending = useCallback(async () => {
    if (!scopeKey) return;
    setPendingCount(await countPendingOfflineOrders(scopeKey));
    setPendingOrders(await listPendingOfflineOrders(scopeKey));
  }, [scopeKey]);

  const applySnapshotToQueryCache = useCallback(
    async (key: string) => {
      const snapshot = await readOfflineSnapshot(key);
      if (!snapshot) return;
      queryClient.setQueryData(['business', 'me'], snapshot.business);
      queryClient.setQueryData(['menu'], {
        menu: snapshot.menu,
        inventoryAvailability: {},
      });
    },
    [queryClient],
  );

  const refreshSnapshot = useCallback(async () => {
    if (!user?.businessId || !user?.id || apiReachability !== 'online') return;
    const record = await fetchAndStoreOfflineSnapshot(user.businessId, user.id, user);
    await ensurePosDeviceRegistered(record.scopeKey);
    await applySnapshotToQueryCache(record.scopeKey);
  }, [apiReachability, applySnapshotToQueryCache, user]);

  const syncNow = useCallback(async () => {
    if (!scopeKey) return;
    const ok = await pingApiHealth();
    if (!ok) return;
    await syncPendingOfflineOrders(scopeKey);
    await refreshPending();
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient, refreshPending, scopeKey]);

  useEffect(() => {
    startApiHeartbeat();
    return subscribeApiReachability(setApiReachability);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !scopeKey) return;
    void requestOfflineStoragePersistence();
    void refreshPending();
  }, [isAuthenticated, refreshPending, scopeKey]);

  useEffect(() => {
    if (!isAuthenticated || !scopeKey) return;
    if (apiReachability === 'online') {
      void refreshSnapshot();
      return;
    }
    void applySnapshotToQueryCache(scopeKey);
  }, [apiReachability, applySnapshotToQueryCache, isAuthenticated, refreshSnapshot, scopeKey]);

  const previousReachability = useRef(apiReachability);
  useEffect(() => {
    if (!scopeKey) return;
    const previous = previousReachability.current;
    previousReachability.current = apiReachability;
    if (previous !== 'online' && apiReachability === 'online') {
      void syncNow();
    }
  }, [apiReachability, scopeKey, syncNow]);

  useEffect(() => {
    if (!isAuthenticated || !scopeKey) return;
    const interval = setInterval(() => {
      void refreshPending();
    }, 5_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshPending, scopeKey]);

  useEffect(() => {
    if (!isAuthenticated || !scopeKey) return;
    void offlineDb.open().catch(() => undefined);
  }, [isAuthenticated, scopeKey]);

  const value = useMemo<OfflinePosContextValue>(
    () => ({
      apiReachability,
      isOfflineMode: apiReachability === 'offline',
      pendingCount,
      pendingOrders,
      refreshSnapshot,
      syncNow,
      scopeKey,
    }),
    [apiReachability, pendingCount, pendingOrders, refreshSnapshot, scopeKey, syncNow],
  );

  return <OfflinePosContext.Provider value={value}>{children}</OfflinePosContext.Provider>;
}

export function useOfflinePos() {
  const ctx = useContext(OfflinePosContext);
  if (!ctx) {
    return {
      apiReachability: 'online' as ApiReachability,
      isOfflineMode: false,
      pendingCount: 0,
      pendingOrders: [],
      refreshSnapshot: async () => undefined,
      syncNow: async () => undefined,
      scopeKey: null,
    };
  }
  return ctx;
}
