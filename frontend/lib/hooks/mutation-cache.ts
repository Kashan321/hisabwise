import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type {
  Business,
  FloorTable,
  InventoryItem,
  MenuItem,
  Order,
  OrdersQueryResult,
  Promotion,
} from '@/lib/api/types';
import type { MenuQueryData } from './queries';

type Snapshot = { queryKey: QueryKey; data: unknown };

export function snapshotQueries(
  qc: QueryClient,
  queryKey: QueryKey,
): Snapshot[] {
  return qc
    .getQueriesData({ queryKey })
    .map(([key, data]) => ({ queryKey: key, data }));
}

export function restoreSnapshots(qc: QueryClient, snapshots: Snapshot[] | undefined) {
  if (!snapshots) return;
  for (const { queryKey, data } of snapshots) {
    qc.setQueryData(queryKey, data);
  }
}

/** Patch one order everywhere it appears in the client cache. */
export function patchOrderInCache(qc: QueryClient, orderId: string, patch: Partial<Order>) {
  qc.setQueriesData<OrdersQueryResult>({ queryKey: ['orders', 'list'] }, (old) => {
    if (!old) return old;
    return {
      ...old,
      orders: old.orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o)),
    };
  });

  qc.setQueriesData<Order[]>({ queryKey: ['kitchen', 'queue'] }, (old) => {
    if (!old) return old;
    return old.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
  });

  qc.setQueriesData<Order[]>({ queryKey: ['waiter', 'orders'] }, (old) => {
    if (!old) return old;
    return old.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
  });

  qc.setQueriesData<Order[]>({ queryKey: ['delivery', 'orders'] }, (old) => {
    if (!old) return old;
    return old.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
  });

  qc.setQueryData<{ deliveries?: Order[] } | undefined>(['rider', 'dashboard'], (old) => {
    if (!old?.deliveries) return old;
    return {
      ...old,
      deliveries: old.deliveries.map((o) =>
        o.id === orderId ? { ...o, ...patch } : o,
      ),
    };
  });

  qc.setQueryData<Order>(['orders', orderId], (old) =>
    old ? { ...old, ...patch } : old,
  );
}

/** Remove order from live kitchen/waiter queues (completed / cancelled). */
export function removeOrderFromLiveQueues(qc: QueryClient, orderId: string) {
  qc.setQueriesData<Order[]>({ queryKey: ['kitchen', 'queue'] }, (old) =>
    old ? old.filter((o) => o.id !== orderId) : old,
  );
  qc.setQueriesData<Order[]>({ queryKey: ['waiter', 'orders'] }, (old) => {
    if (!old) return old;
    return old.filter((o) => o.id !== orderId || o.isDraft);
  });
}

export function replaceOrderInCache(qc: QueryClient, order: Order) {
  patchOrderInCache(qc, order.id, order);
}

export function patchMenuItemInCache(
  qc: QueryClient,
  itemId: string,
  patch: Partial<MenuItem>,
) {
  qc.setQueryData<MenuQueryData>(['menu'], (old) => {
    if (!old) return old;
    return {
      ...old,
      menu: old.menu.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      })),
    };
  });
}

export function patchBusinessInCache(qc: QueryClient, patch: Partial<Business>) {
  qc.setQueryData<Business>(['business', 'me'], (old) =>
    old ? { ...old, ...patch } : old,
  );
}

export function patchFloorTableInCache(
  qc: QueryClient,
  tableId: string,
  patch: Partial<FloorTable>,
) {
  qc.setQueriesData<FloorTable[]>({ queryKey: ['floor-plan', 'tables'] }, (old) => {
    if (!old) return old;
    return old.map((t) => (t.id === tableId ? { ...t, ...patch } : t));
  });
}

export function patchPromotionInCache(
  qc: QueryClient,
  id: string,
  patch: Partial<Promotion>,
) {
  qc.setQueriesData<Promotion[]>({ queryKey: ['promotions'] }, (old) => {
    if (!old) return old;
    return old.map((p) => (p.id === id ? { ...p, ...patch } : p));
  });
}

export function patchInventoryItemInCache(
  qc: QueryClient,
  id: string,
  patch: Partial<InventoryItem>,
) {
  qc.setQueriesData<InventoryItem[]>({ queryKey: ['inventory', 'items'] }, (old) => {
    if (!old) return old;
    return old.map((item) => (item.id === id ? { ...item, ...patch } : item));
  });
}

/** Background reconcile — never blocks the UI thread waiting on network. */
export function reconcileInBackground(qc: QueryClient, queryKey: QueryKey) {
  void qc.invalidateQueries({ queryKey, refetchType: 'active' });
}
