import { apiFetch } from '@/lib/api/client';
import type { Order } from '@/lib/api/types';
import { offlineDb, type PendingOfflineOrderRecord } from '@/lib/offline/db';

export type { PendingOfflineOrderRecord };

type BatchSyncResult = {
  idempotencyKey: string;
  success: boolean;
  idempotentReplay: boolean;
  offlineTicketLabel?: string;
  serverTicketLabel?: string | null;
  orderId?: string;
  error?: string;
};

export async function countPendingOfflineOrders(scopeKey?: string) {
  const rows = scopeKey
    ? await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray()
    : await offlineDb.pendingOrders.toArray();
  return rows.filter((row) => row.syncStatus === 'pending' || row.syncStatus === 'error').length;
}

export async function listPendingOfflineOrders(scopeKey: string) {
  return offlineDb.pendingOrders.where({ scopeKey }).toArray();
}

export async function queueOfflineOrder(record: PendingOfflineOrderRecord) {
  await offlineDb.pendingOrders.put(record);
}

export async function syncPendingOfflineOrders(scopeKey: string) {
  const pending = (await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray())
    .filter((row) => row.syncStatus === 'pending' || row.syncStatus === 'error')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!pending.length) return [] as BatchSyncResult[];

  const orders = pending.map((entry) => entry.payload);
  for (const entry of pending) {
    await offlineDb.pendingOrders.update(entry.id, { syncStatus: 'syncing', syncError: undefined });
  }

  const { results } = await apiFetch<{ results: BatchSyncResult[] }>('/pos/orders/sync-batch', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  });

  for (const result of results) {
    const entry = pending.find((row) => row.idempotencyKey === result.idempotencyKey);
    if (!entry) continue;
    if (result.success) {
      await offlineDb.pendingOrders.update(entry.id, {
        syncStatus: 'synced',
        serverTicketLabel: result.serverTicketLabel ?? undefined,
        serverOrderId: result.orderId,
        syncError: undefined,
      });
    } else {
      await offlineDb.pendingOrders.update(entry.id, {
        syncStatus: 'error',
        syncError: result.error ?? 'Sync failed',
      });
    }
  }

  return results;
}

export function buildOfflineReceiptOrder(input: {
  id: string;
  ticketLabel: string;
  orderType: Order['orderType'];
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  items: Order['items'];
  paymentStatus: Order['paymentStatus'];
  status: Order['status'];
  createdAt: string;
  paymentMethod?: Order['paymentMethod'];
  payments?: Order['payments'];
  notes?: string | null;
}): Order {
  return {
    id: input.id,
    businessId: 'offline',
    ticketLabel: input.ticketLabel,
    source: 'STAFF_ASSISTED',
    orderType: input.orderType,
    status: input.status,
    isDraft: false,
    subtotal: String(input.subtotal),
    discountAmount: '0',
    taxAmount: String(input.taxAmount),
    serviceAmount: String(input.serviceAmount),
    deliveryAmount: '0',
    totalAmount: String(input.totalAmount),
    notes: input.notes ?? null,
    items: input.items,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod ?? null,
    payments: input.payments,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  } as Order;
}

export async function clearOfflineDataForScope(scopeKey: string) {
  await offlineDb.pendingOrders.where({ scopeKey }).delete();
  await offlineDb.snapshots.delete(scopeKey);
  await offlineDb.devices.delete(scopeKey);
}
