import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';
import type { Order } from '@/lib/api/types';
import { allocateOfflineTicket } from '@/lib/offline/device';
import { type PendingOfflineOrderRecord } from '@/lib/offline/db';
import { buildOfflineReceiptOrder, queueOfflineOrder } from '@/lib/offline/sync';

type OfflineCheckoutInput = {
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
  payment: CompleteOrderPaymentPayload;
  receiptItems: Order['items'];
  snapshotLineUnitPrices?: Record<string, string>;
  notes?: string | null;
};

export async function enqueueOfflineCheckout(input: OfflineCheckoutInput) {
  const { offlineTicketLabel, offlineTicketNumber, deviceKey } = await allocateOfflineTicket(
    input.scopeKey,
  );

  const now = new Date().toISOString();
  const receiptOrder = buildOfflineReceiptOrder({
    id: input.idempotencyKey,
    ticketLabel: offlineTicketLabel,
    orderType: input.orderType,
    subtotal: input.pricing.subtotal,
    taxAmount: input.pricing.taxAmount,
    serviceAmount: input.pricing.serviceAmount,
    totalAmount: input.pricing.totalAmount,
    items: input.receiptItems,
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    paymentMethod: 'CASH',
    payments: input.payment.payments.map((line, index) => ({
      id: `offline-pay-${index}`,
      createdAt: now,
      method: line.method,
      amount: String(line.amount),
      amountReceived: line.amountReceived != null ? String(line.amountReceived) : undefined,
      changeGiven: line.changeGiven != null ? String(line.changeGiven) : undefined,
      referenceNumber: line.referenceNumber ?? null,
    })),
    createdAt: now,
    notes: input.notes,
  });

  const payload = {
    ...input.createPayload,
    idempotencyKey: input.idempotencyKey,
    deviceKey,
    offlineTicketNumber,
    offlineTicketLabel,
    completeWithCash: {
      amountReceived: input.payment.payments[0]?.amountReceived,
      changeGiven: input.payment.payments[0]?.changeGiven,
    },
    snapshotLineUnitPrices: input.snapshotLineUnitPrices,
  };

  const record: PendingOfflineOrderRecord = {
    id: input.idempotencyKey,
    scopeKey: input.scopeKey,
    idempotencyKey: input.idempotencyKey,
    syncStatus: 'pending',
    offlineTicketLabel,
    offlineTicketNumber,
    createdAt: now,
    payload,
    receiptOrder,
  };

  await queueOfflineOrder(record);
  return { receiptOrder, offlineTicketLabel };
}
