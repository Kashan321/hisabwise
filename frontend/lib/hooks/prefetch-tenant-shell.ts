import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';
import type { AuthUser } from '@/lib/api/types';
import {
  canPrefetchFloorTables,
  canPrefetchMenu,
  canPrefetchOrders,
} from '@/lib/auth/permissions';
import { ORDER_LIST_STALE_MS, REFERENCE_GC_MS, REFERENCE_STALE_MS } from '@/lib/query-cache';
import type { MenuQueryData } from './queries';

/**
 * Warm caches for pages staff open most often — runs once per authenticated session shell.
 * Only prefetches data the current user's role is allowed to access.
 */
export function usePrefetchTenantShell(enabled: boolean, user: AuthUser | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !user) return;

    if (canPrefetchMenu(user)) {
      void qc.prefetchQuery({
        queryKey: ['menu'],
        queryFn: () =>
          apiFetch<MenuQueryData>('/menu').then((d) => ({
            menu: d.menu,
            inventoryAvailability: d.inventoryAvailability,
          })),
        staleTime: REFERENCE_STALE_MS,
        gcTime: REFERENCE_GC_MS,
      });
    }

    if (canPrefetchOrders(user)) {
      void qc.prefetchQuery({
        queryKey: ['orders', 'list', ''],
        queryFn: () =>
          apiFetch<{ orders: import('@/lib/api/types').Order[]; meta?: { total: number } }>(
            '/orders',
          ).then((d) => ({
            orders: d.orders,
            total: d.meta?.total ?? d.orders.length,
          })),
        staleTime: ORDER_LIST_STALE_MS,
      });
    }

    if (canPrefetchFloorTables(user)) {
      void qc.prefetchQuery({
        queryKey: ['floor-plan', 'tables', 'all'],
        queryFn: () =>
          apiFetch<{ tables: import('@/lib/api/types').FloorTable[] }>('/floor-plan/tables').then(
            (d) => d.tables,
          ),
        staleTime: REFERENCE_STALE_MS,
        gcTime: REFERENCE_GC_MS,
      });
    }
  }, [enabled, user, qc]);
}
