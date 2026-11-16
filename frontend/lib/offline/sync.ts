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

function isQueueActive(status: PendingOfflineOrderRecord['syncStatus']) {
  return status === 'pending' || status === 'error' || status === 'syncing';
}

export async function countPendingOfflineOrders(scopeKey?: string) {
  const rows = scopeKey
    ? await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray()
    : await offlineDb.pendingOrders.toArray();
  return rows.filter((row) => isQueueActive(row.syncStatus)).length;
}

export async function listPendingOfflineOrders(scopeKey: string) {
  return offlineDb.pendingOrders.where({ scopeKey }).toArray();
}

export async function queueOfflineOrder(record: PendingOfflineOrderRecord) {
  await offlineDb.pendingOrders.put(record);
}

export function buildSyncOrderPayload(entry: PendingOfflineOrderRecord): Record<string, unknown> {
  const createPayload = entry.createPayload ?? entry.payload ?? {};
  const merged: Record<string, unknown> = {
    ...createPayload,
    idempotencyKey: entry.idempotencyKey,
    offlineTicketLabel: entry.offlineTicketLabel,
    offlineTicketNumber: entry.offlineTicketNumber,
  };
  if (entry.itemUpdates?.length) {
    merged.itemUpdates = entry.itemUpdates.map((update) => ({
      items: update.items,
      taxRate: update.taxRate,
      serviceRate: update.serviceRate,
    }));
  }
  if (entry.itemAdjustments?.length) {
    merged.offlineItemAdjustments = entry.itemAdjustments.map((row) => ({
      clientItemId: row.clientItemId,
      menuItemId: row.menuItemId,
      delta: row.delta,
    }));
  }
  if (entry.pricingUpdates?.length) {
    merged.offlinePricingUpdates = entry.pricingUpdates.map((row) => row.patch);
  }
  if (entry.replaySendToKitchen) {
    merged.replaySendToKitchen = true;
  }
  if (entry.lifecycle === 'completed' && entry.completeWithCash) {
    merged.completeWithCash = entry.completeWithCash;
  } else if (entry.lifecycle === 'cancelled') {
    merged.offlineOrderStatus = 'CANCELLED';
  } else if (entry.lifecycle === 'open') {
    merged.offlineOrderStatus = entry.receiptOrder.status;
  }
  return merged;
}

export async function syncPendingOfflineOrders(scopeKey: string) {
  const pending = (await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray())
    .filter((row) => isQueueActive(row.syncStatus))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!pending.length) return [] as BatchSyncResult[];

  const orders = pending.map((entry) => buildSyncOrderPayload(entry));
  for (const entry of pending) {
    await offlineDb.pendingOrders.update(entry.id, { syncStatus: 'syncing', syncError: undefined });
  }

  let results: BatchSyncResult[];
  try {
    ({ results } = await apiFetch<{ results: BatchSyncResult[] }>('/pos/orders/sync-batch', {
      method: 'POST',
      body: JSON.stringify({ orders }),
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync request failed';
    for (const entry of pending) {
      await offlineDb.pendingOrders.update(entry.id, { syncStatus: 'error', syncError: message });
    }
    return [];
  }

  const resultKeys = new Set(results.map((r) => r.idempotencyKey));
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

  for (const entry of pending) {
    if (!resultKeys.has(entry.idempotencyKey)) {
      await offlineDb.pendingOrders.update(entry.id, {
        syncStatus: 'error',
        syncError: 'No sync result from server',
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
  isDraft?: boolean;
}): Order {
  return {
    id: input.id,
    businessId: 'offline',
    ticketLabel: input.ticketLabel,
    source: 'STAFF_ASSISTED',
    orderType: input.orderType,
    status: input.status,
    isDraft: input.isDraft ?? false,
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
