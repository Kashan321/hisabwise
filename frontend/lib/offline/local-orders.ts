import type { Order } from '@/lib/api/types';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';
import { allocateOfflineTicket } from '@/lib/offline/device';
import {
  offlineDb,
  type OfflineItemUpdateRecord,
  type OfflineOrderLifecycle,
  type PendingOfflineOrderRecord,
} from '@/lib/offline/db';
import { buildOfflineReceiptOrder, queueOfflineOrder } from '@/lib/offline/sync';
import { orderNextStatus } from '@/components/orders/order-badges';
import { canAddItemsToOpenTab } from '@/lib/open-tab-order';

export const OFFLINE_ORDER_ID_PREFIX = 'offline:';

export function isOfflineLocalOrderId(orderId: string | null | undefined) {
  return !!orderId && orderId.startsWith(OFFLINE_ORDER_ID_PREFIX);
}

export function isDeviceLocalOrder(order: { id: string; businessId?: string | null }) {
  return order.businessId === 'offline' || isOfflineLocalOrderId(order.id);
}

export function offlineLocalOrderId(idempotencyKey: string) {
  return `${OFFLINE_ORDER_ID_PREFIX}${idempotencyKey}`;
}

export function idempotencyKeyFromOfflineId(orderId: string) {
  return orderId.replace(/^offline:/, '');
}

function emitQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hisabwise:offline-queue-changed'));
  }
}

async function findPendingRow(scopeKey: string, orderId: string) {
  const key = isOfflineLocalOrderId(orderId) ? idempotencyKeyFromOfflineId(orderId) : orderId;
  let row = await offlineDb.pendingOrders.get(key);
  if (!row) {
    const rows = await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray();
    row = rows.find(
      (entry) =>
        entry.receiptOrder.id === orderId ||
        entry.id === orderId ||
        offlineLocalOrderId(entry.id) === orderId,
    );
  }
  if (!row || row.scopeKey !== scopeKey) return null;
  return row;
}

function isActiveOrder(order: Order) {
  return order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && !order.isDraft;
}

export async function listActiveLocalOrders(scopeKey: string): Promise<Order[]> {
  const rows = await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray();
  return rows
    .map((row) => row.receiptOrder)
    .filter((order) => isActiveOrder(order))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getLocalOrderById(scopeKey: string, orderId: string): Promise<Order | null> {
  const key = isOfflineLocalOrderId(orderId) ? idempotencyKeyFromOfflineId(orderId) : orderId;
  let row = await offlineDb.pendingOrders.get(key);
  if (!row || row.scopeKey !== scopeKey) {
    const rows = await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray();
    row = rows.find((entry) => entry.receiptOrder.id === orderId) ?? undefined;
  }
  if (!row || row.scopeKey !== scopeKey) return null;
  return row.receiptOrder;
}

type PlaceOfflineOrderInput = {
  scopeKey: string;
  idempotencyKey: string;
  createPayload: Record<string, unknown>;
  pricing: {
    subtotal: number;
    taxAmount: number;
    serviceAmount: number;
    totalAmount: number;
  };
  orderType: Order['orderType'];
  receiptItems: Order['items'];
  snapshotLineUnitPrices?: Record<string, string>;
  tableIdentifier?: string | null;
  notes?: string | null;
};

export async function placeOfflineOrder(input: PlaceOfflineOrderInput) {
  const { offlineTicketLabel, offlineTicketNumber, deviceKey } = await allocateOfflineTicket(
    input.scopeKey,
  );
  const now = new Date().toISOString();
  const createPayload = {
    ...input.createPayload,
    isDraft: false,
    idempotencyKey: input.idempotencyKey,
    deviceKey,
    offlineTicketNumber,
    offlineTicketLabel,
    snapshotLineUnitPrices: input.snapshotLineUnitPrices,
  };

  const receiptOrder = buildOfflineReceiptOrder({
    id: offlineLocalOrderId(input.idempotencyKey),
    ticketLabel: offlineTicketLabel,
    orderType: input.orderType,
    subtotal: input.pricing.subtotal,
    taxAmount: input.pricing.taxAmount,
    serviceAmount: input.pricing.serviceAmount,
    totalAmount: input.pricing.totalAmount,
    items: input.receiptItems,
    status: 'RECEIVED',
    paymentStatus: 'PENDING',
    createdAt: now,
    notes: input.notes ?? null,
  });
  receiptOrder.sentToKitchenAt = now;
  if (input.tableIdentifier) {
    receiptOrder.tableIdentifier = input.tableIdentifier;
  }
  const tableId = input.createPayload.tableId as string | undefined;
  if (tableId) {
    receiptOrder.tableId = tableId;
  }

  const record: PendingOfflineOrderRecord = {
    id: input.idempotencyKey,
    scopeKey: input.scopeKey,
    idempotencyKey: input.idempotencyKey,
    syncStatus: 'pending',
    offlineTicketLabel,
    offlineTicketNumber,
    createdAt: now,
    lifecycle: 'open',
    createPayload,
    itemUpdates: [],
    receiptOrder,
  };

  await queueOfflineOrder(record);
  emitQueueChanged();
  return { order: receiptOrder, offlineTicketLabel };
}

type AddOfflineItemsInput = {
  scopeKey: string;
  orderId: string;
  items: Array<Record<string, unknown>>;
  receiptItems: Order['items'];
  pricing: {
    subtotal: number;
    taxAmount: number;
    serviceAmount: number;
    totalAmount: number;
  };
  taxRate?: number;
  serviceRate?: number;
};

export async function addItemsToLocalOrder(input: AddOfflineItemsInput) {
  const row = await findPendingRow(input.scopeKey, input.orderId);
  if (!row) {
    throw new Error('Offline order not found on this device.');
  }
  const key = row.id;
  if (!canAddItemsToOpenTab(row.receiptOrder)) {
    throw new Error('This order cannot accept more items.');
  }
  const now = new Date().toISOString();
  const update: OfflineItemUpdateRecord = {
    appliedAt: now,
    items: input.items,
    taxRate: input.taxRate,
    serviceRate: input.serviceRate,
  };
  const nextItems = [...(row.receiptOrder.items ?? []), ...(input.receiptItems ?? [])];
  const receiptOrder = {
    ...row.receiptOrder,
    items: nextItems,
    subtotal: String(input.pricing.subtotal),
    taxAmount: String(input.pricing.taxAmount),
    serviceAmount: String(input.pricing.serviceAmount),
    totalAmount: String(input.pricing.totalAmount),
  } as Order;
  await offlineDb.pendingOrders.update(key, {
    itemUpdates: [...(row.itemUpdates ?? []), update],
    receiptOrder,
    syncStatus: row.syncStatus === 'synced' ? 'pending' : row.syncStatus,
  });
  emitQueueChanged();
  return receiptOrder;
}

export async function advanceLocalOrderStatus(scopeKey: string, orderId: string) {
  const row = await findPendingRow(scopeKey, orderId);
  if (!row) {
    throw new Error('Offline order not found.');
  }
  const key = row.id;
  const next = orderNextStatus(row.receiptOrder.status);
  if (!next || next === 'COMPLETED') {
    throw new Error('Use payment to complete this order.');
  }
  const receiptOrder = { ...row.receiptOrder, status: next as Order['status'] } as Order;
  await offlineDb.pendingOrders.update(key, { receiptOrder });
  emitQueueChanged();
  return receiptOrder;
}

export async function completeLocalOrderPayment(
  scopeKey: string,
  orderId: string,
  payment: CompleteOrderPaymentPayload,
) {
  const row = await findPendingRow(scopeKey, orderId);
  if (!row) {
    throw new Error('Offline order not found.');
  }
  const key = row.id;
  if (row.receiptOrder.status === 'COMPLETED') {
    return row.receiptOrder;
  }
  const now = new Date().toISOString();
  const receiptOrder = {
    ...row.receiptOrder,
    status: 'COMPLETED',
    paymentStatus: payment.paymentStatus ?? 'PAID',
    paymentMethod: payment.paymentMethod ?? 'CASH',
    payments: payment.payments.map((line, index) => ({
      id: `offline-pay-${index}`,
      createdAt: now,
      method: line.method,
      amount: String(line.amount),
      amountReceived: line.amountReceived != null ? String(line.amountReceived) : undefined,
      changeGiven: line.changeGiven != null ? String(line.changeGiven) : undefined,
      referenceNumber: line.referenceNumber ?? null,
    })),
  } as Order;
  await offlineDb.pendingOrders.update(key, {
    lifecycle: 'completed',
    completeWithCash: {
      amountReceived: payment.payments[0]?.amountReceived,
      changeGiven: payment.payments[0]?.changeGiven,
    },
    receiptOrder,
    syncStatus: row.syncStatus === 'synced' ? 'pending' : row.syncStatus,
  });
  emitQueueChanged();
  return receiptOrder;
}

export async function cancelLocalOrder(scopeKey: string, orderId: string) {
  const row = await findPendingRow(scopeKey, orderId);
  if (!row) return;
  const key = row.id;
  const receiptOrder = {
    ...row.receiptOrder,
    status: 'CANCELLED' as const,
    updatedAt: new Date().toISOString(),
  };
  await offlineDb.pendingOrders.update(key, {
    lifecycle: 'cancelled',
    receiptOrder,
    syncStatus: 'pending',
  });
  emitQueueChanged();
}