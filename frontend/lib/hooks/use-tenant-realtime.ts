'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  invalidateQueriesForLegacyKitchenMessage,
  invalidateQueriesForTenantEvent,
} from '@/lib/realtime/tenant-events';
import { subscribeTenantRealtime } from '@/lib/realtime/tenant-realtime-client';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * Subscribes to tenant-wide realtime events and refreshes relevant React Query caches.
 * Uses a shared WebSocket connection so layouts/pages do not reconnect on every render.
 */
export function useTenantRealtime(enabled = true) {
  const qc = useQueryClient();
  const qcRef = useRef(qc);
  qcRef.current = qc;
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  useEffect(() => {
    if (!enabled) return;

    return subscribeTenantRealtime(
      (message) => {
        if (message.type === 'tenant.event') {
          invalidateQueriesForTenantEvent(qcRef.current, message.event);
          return;
        }
        if (message.type === 'kitchen.updated') {
          invalidateQueriesForLegacyKitchenMessage(qcRef.current);
        }
      },
      setConnectionState,
    );
  }, [enabled]);

  return { connectionState };
}

/** @deprecated Use useTenantRealtime */
export const useKitchenRealtime = useTenantRealtime;
