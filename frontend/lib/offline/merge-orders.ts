import type { Order, OrderListFilters } from '@/lib/api/types';
import type { PendingOfflineOrderRecord } from '@/lib/offline/db';
import { isDeviceLocalOrder } from '@/lib/offline/local-orders';

function orderInDateRange(order: Order, from: string, to: string): boolean {
  const day = order.createdAt.slice(0, 10);
  return day >= from && day <= to;
}

function orderMatchesStatusGroup(order: Order, tab: OrderListFilters['statusGroup']): boolean {
  if (!tab || tab === 'all') return true;
  if (tab === 'active') {
    return order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && !order.isDraft;
  }
  if (tab === 'completed') return order.status === 'COMPLETED';
  if (tab === 'cancelled') return order.status === 'CANCELLED';
  return true;
}

function shouldSkipLocalRow(
  row: PendingOfflineOrderRecord,
  apiById: Map<string, Order>,
  apiByIdempotency: Set<string>,
): boolean {
  if (row.serverOrderId && apiById.has(row.serverOrderId)) return true;
  if (apiByIdempotency.has(row.idempotencyKey)) return true;
  if (row.syncStatus === 'synced' && row.serverOrderId) return true;
  return false;
}

export function mergeApiWithLocalOrders(
  apiOrders: Order[],
  localRows: PendingOfflineOrderRecord[],
  filters?: {
    statusGroup?: OrderListFilters['statusGroup'];
    dateFrom?: string;
    dateTo?: string;
    includeDrafts?: boolean;
  },
): Order[] {
  const byId = new Map<string, Order>();
  const apiByIdempotency = new Set(
    apiOrders
      .map((o) => (o as Order & { idempotencyKey?: string | null }).idempotencyKey)
      .filter(Boolean) as string[],
  );

  for (const order of apiOrders) {
    if (!filters?.includeDrafts && order.isDraft) continue;
    if (filters?.dateFrom && filters?.dateTo && !orderInDateRange(order, filters.dateFrom, filters.dateTo)) {
      continue;
    }
    if (!orderMatchesStatusGroup(order, filters?.statusGroup)) continue;
    byId.set(order.id, order);
  }

  for (const row of localRows) {
    if (shouldSkipLocalRow(row, byId, apiByIdempotency)) continue;
    const order = row.receiptOrder;
    if (!filters?.includeDrafts && order.isDraft) continue;
    const localDeviceOrder = isDeviceLocalOrder(order);
    if (
      filters?.dateFrom &&
      filters?.dateTo &&
      !orderInDateRange(order, filters.dateFrom, filters.dateTo) &&
      !localDeviceOrder
    ) {
      continue;
    }
    if (!orderMatchesStatusGroup(order, filters?.statusGroup)) continue;
    if (!byId.has(order.id)) {
      byId.set(order.id, order);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function filterKitchenTickets(orders: Order[]): Order[] {
  return orders.filter(
    (o) =>
      !o.isDraft &&
      o.status !== 'COMPLETED' &&
      o.status !== 'CANCELLED' &&
      (o.sentToKitchenAt != null || isDeviceLocalOrder(o)),
  );
}