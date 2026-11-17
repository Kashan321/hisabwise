'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Order, OrderListFilters } from '@/lib/api/types';
import { offlineDb, type PendingOfflineOrderRecord } from '@/lib/offline/db';
import { mergeApiWithLocalOrders } from '@/lib/offline/merge-orders';
import { isPosEffectivelyOffline } from '@/lib/offline/effective-offline';
import { getApiReachability } from '@/lib/offline/connectivity';

export function usePendingOrdersForScope(scopeKey: string | null) {
  const [rows, setRows] = useState<PendingOfflineOrderRecord[]>([]);

  useEffect(() => {
    if (!scopeKey) {
      setRows([]);
      return;
    }
    const load = async () => setRows(await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray());
    void load();
    const onChange = () => void load();
    window.addEventListener('hisabwise:offline-queue-changed', onChange);
    return () => window.removeEventListener('hisabwise:offline-queue-changed', onChange);
  }, [scopeKey]);

  return rows;
}

export function useMergedOrdersList(
  apiOrders: Order[],
  scopeKey: string | null,
  filters: {
    statusGroup?: OrderListFilters['statusGroup'];
    dateFrom?: string;
    dateTo?: string;
  },
  browserOffline: boolean,
) {
  const rows = usePendingOrdersForScope(scopeKey);
  const apiReachability = getApiReachability();

  const effectivelyOffline = isPosEffectivelyOffline({
    apiReachability,
    browserOnline: !browserOffline,
  });

  return useMemo(
    () =>
      mergeApiWithLocalOrders(apiOrders, rows, {
        statusGroup: filters.statusGroup,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    [
      apiOrders,
      rows,
      filters.statusGroup,
      filters.dateFrom,
      filters.dateTo,
    ],
  );
}