import type { Order } from '@/lib/api/types';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';

export type OfflineLocalOrderOps = {
  advanceStatus: (order: Order) => Promise<Order>;
  completeWithPayment: (orderId: string, payload: CompleteOrderPaymentPayload) => Promise<Order>;
  cancel: (orderId: string) => Promise<void>;
};