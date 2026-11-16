import type { Order } from '@/lib/api/types';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';
import { allocateOfflineTicket } from '@/lib/offline/device';
import {
  offlineDb,
  type OfflineItemUpdateRecord,
  type OfflineOrderLifecycle,
  type OfflinePricingUpdateRecord,
  type PendingOfflineOrderRecord,
} from '@/lib/offline/db';
import { buildOfflineReceiptOrder, queueOfflineOrder } from '@/lib/offline/sync';
import {
  ratesFromCreatePayload,
  recalculateReceiptOrderTotals,
} from '@/lib/offline/local-order-pricing';
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

function isHeldOrder(order: Order) {
  return Boolean(order.isDraft && !order.sentToKitchenAt && order.status !== 'CANCELLED');
}

export async function listHeldLocalOrders(scopeKey: string): Promise<Order[]> {
  const rows = await offlineDb.pendingOrders.where('scopeKey').equals(scopeKey).toArray();
  return rows
    .map((row) => row.receiptOrder)
    .filter((order) => isHeldOrder(order))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
  asDraft?: boolean;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
};

export async function placeOfflineOrder(input: PlaceOfflineOrderInput) {
  const { offlineTicketLabel, offlineTicketNumber, deviceKey } = await allocateOfflineTicket(
    input.scopeKey,
  );
  const now = new Date().toISOString();
  const asDraft = input.asDraft ?? false;
  const createPayload = {
    ...input.createPayload,
    isDraft: asDraft,
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
    isDraft: asDraft,
  });
  if (!asDraft) {
    receiptOrder.sentToKitchenAt = now;
  }
  if (input.tableIdentifier) {
    receiptOrder.tableIdentifier = input.tableIdentifier;
  }
  const tableId = input.createPayload.tableId as string | undefined;
  if (tableId) {
    receiptOrder.tableId = tableId;
  }
  if (input.customerName) receiptOrder.customerName = input.customerName;
  if (input.customerPhone) receiptOrder.customerPhone = input.customerPhone;
  if (input.deliveryAddress) receiptOrder.deliveryAddress = input.deliveryAddress;
  if (input.deliveryNotes) receiptOrder.deliveryNotes = input.deliveryNotes;

  const record: PendingOfflineOrderRecord = {
    id: input.idempotencyKey,
    scopeKey: input.scopeKey,
    idempotencyKey: input.idempotencyKey,
    syncStatus: 'pending',
    offlineTicketLabel,
    offlineTicketNumber,
    createdAt: now,
    lifecycle: asDraft ? 'held' : 'open',
    createPayload,
    itemUpdates: [],
    itemAdjustments: [],
    pricingUpdates: [],
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
    syncStatus: row.syncStatus === 'synced' ? 'pending' : row.syncStatus,
  });
  emitQueueChanged();
}

export async function sendLocalOrderToKitchen(scopeKey: string, orderId: string) {
  const row = await findPendingRow(scopeKey, orderId);
  if (!row) {
    throw new Error('Offline order not found on this device.');
  }
  const now = new Date().toISOString();
  const receiptOrder = {
    ...row.receiptOrder,
    isDraft: false,
    sentToKitchenAt: now,
    updatedAt: now,
  } as Order;
  await offlineDb.pendingOrders.update(row.id, {
    lifecycle: 'open',
    replaySendToKitchen: true,
    createPayload: { ...row.createPayload, isDraft: false },
    receiptOrder,
    syncStatus: row.syncStatus === 'synced' ? 'pending' : row.syncStatus,
  });
  emitQueueChanged();
  return receiptOrder;
}

export async function cancelLocalHeldOrder(scopeKey: string, orderId: string) {
  return cancelLocalOrder(scopeKey, orderId);
}

type LocalPricingPatch = OfflinePricingUpdateRecord['patch'];

export async function updateLocalOrderPricing(
  scopeKey: string,
  orderId: string,
  patch: LocalPricingPatch,
  priced: { subtotal: number; taxAmount: number; serviceAmount: number; totalAmount: number; discountAmount?: number },
) {
  const row = await findPendingRow(scopeKey, orderId);
  if (!row) throw new Error('Offline order not found.');
  const now = new Date().toISOString();
  const receiptOrder = {
    ...row.receiptOrder,
    subtotal: String(priced.subtotal),
    taxAmount: String(priced.taxAmount),
    serviceAmount: String(priced.serviceAmount),
    totalAmount: String(priced.totalAmount),
    discountAmount: String(priced.discountAmount ?? row.receiptOrder.discountAmount ?? 0),
    promotionId: patch.promotionId === undefined ? row.receiptOrder.promotionId : patch.promotionId,
    notes: patch.notes ?? row.receiptOrder.notes,
    updatedAt: now,
  } as Order;
  await offlineDb.pendingOrders.update(row.id, {
    pricingUpdates: [
      ...(row.pricingUpdates ?? []),
      { appliedAt: now, patch },
    ],
    receiptOrder,
    syncStatus: row.syncStatus === 'synced' ? 'pending' : row.syncStatus,
  });
  emitQueueChanged();
  return receiptOrder;
}

export async function adjustLocalOrderItemQuantity(
  scopeKey: string,
  orderId: string,
  orderItemId: string,
  delta: number,
) {
  const row = await findPendingRow(scopeKey, orderId);
  if (!row) throw new Error('Offline order not found.');
  const items = [...(row.receiptOrder.items ?? [])];
  const index = items.findIndex((line) => line.id === orderItemId);
  if (index < 0) throw new Error('Order item not found.');
  const line = items[index];
  const nextQty = line.quantity + delta;
  if (nextQty < 0) throw new Error('Quantity cannot be negative.');
  if (nextQty === 0 && items.length === 1) {
    throw new Error('Cannot remove the last item from an order');
  }
  const unitPrice = Number(line.unitPrice ?? 0);
  if (nextQty === 0) {
    items.splice(index, 1);
  } else {
    items[index] = {
      ...line,
      quantity: nextQty,
      lineTotal: String(unitPrice * nextQty),
    };
  }
  const rates = ratesFromCreatePayload(row.createPayload);
  const receiptOrder = recalculateReceiptOrderTotals(
    { ...row.receiptOrder, items },
    rates,
  );
  const now = new Date().toISOString();
  await offlineDb.pendingOrders.update(row.id, {
    itemAdjustments: [
      ...(row.itemAdjustments ?? []),
      { appliedAt: now, clientItemId: orderItemId, menuItemId: line.menuItemId ?? '', delta },
    ],
    receiptOrder,
    syncStatus: row.syncStatus === 'synced' ? 'pending' : row.syncStatus,
  });
  emitQueueChanged();
  return receiptOrder;
}