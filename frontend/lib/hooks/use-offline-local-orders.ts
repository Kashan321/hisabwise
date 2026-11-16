'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Order } from '@/lib/api/types';
import { listActiveLocalOrders } from '@/lib/offline/local-orders';

export function useOfflineActiveOrders(scopeKey: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);

  const refresh = useCallback(async () => {
    if (!scopeKey) {
      setOrders([]);
      return;
    }
    setOrders(await listActiveLocalOrders(scopeKey));
  }, [scopeKey]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener('hisabwise:offline-queue-changed', onChange);
    return () => window.removeEventListener('hisabwise:offline-queue-changed', onChange);
  }, [refresh]);

  return { orders, refresh };
}