import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { Order } from '@/lib/api/types';
import { buildCompleteOrderPaymentPayload, type OrderPaymentLine } from '@/lib/payment-methods';

export function createIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      source: 'STAFF_ASSISTED';
      orderType?: 'DINE_IN' | 'TAKEAWAY';
      notes?: string;
      isDraft?: boolean;
      idempotencyKey?: string;
      items: {
        menuItemId: string;
        quantity: number;
        variantId?: string;
      }[];
    }) =>
      apiFetch<{ order: Order; idempotentReplay?: boolean }>('/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSendOrderToKitchen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiFetch<{ order: Order }>(`/orders/${orderId}/send-to-kitchen`, { method: 'POST' }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      qc.setQueryData(['orders', data.order.id], data.order);
    },
  });
}

export function useAddOrderItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      items,
    }: {
      orderId: string;
      items: { menuItemId: string; quantity: number; variantId?: string }[];
    }) =>
      apiFetch<{ order: Order }>(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      qc.setQueryData(['orders', data.order.id], data.order);
    },
  });
}

type CompleteOrderVars = {
  id: string;
  status: string;
  payments?: OrderPaymentLine[];
};

export function useCompleteOrderWithPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: CompleteOrderVars & { totalAmount: number }) => {
      const payload = vars.payments?.length
        ? buildCompleteOrderPaymentPayload(vars.payments, vars.totalAmount)
        : undefined;
      return apiFetch<{ order: Order }>(`/orders/${vars.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: vars.status,
          ...(payload
            ? {
                payments: payload.payments,
                paymentStatus: payload.paymentStatus,
                paymentMethod: payload.paymentMethod,
              }
            : {}),
        }),
      });
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      qc.setQueryData(['orders', data.order.id], data.order);
    },
  });
}