'use client';

import { useMemo } from 'react';
import type { Order } from '@/lib/api/types';
import {
  advanceLocalOrderStatus,
  cancelLocalOrder,
  completeLocalOrderPayment,
  updateLocalOrderStatus,
} from '@/lib/offline/local-orders';
import type { OfflineLocalOrderOps } from '@/lib/offline/offline-local-order-ops';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';

export function useOfflineOrderOps(scopeKey: string | null) {
  return useMemo((): OfflineLocalOrderOps | undefined => {
    if (!scopeKey) return undefined;
    return {
      advanceStatus: (order: Order) => advanceLocalOrderStatus(scopeKey, order.id),
      completeWithPayment: (orderId: string, payload: CompleteOrderPaymentPayload) =>
        completeLocalOrderPayment(scopeKey, orderId, payload),
      cancel: (orderId: string) => cancelLocalOrder(scopeKey, orderId),
    };
  }, [scopeKey]);
}

export function useOfflineKitchenOps(scopeKey: string | null) {
  return useMemo(() => {
    if (!scopeKey) return undefined;
    return {
      setStatus: (orderId: string, status: Order['status']) =>
        updateLocalOrderStatus(scopeKey, orderId, status),
      bump: (orderId: string, next: Order['status']) =>
        updateLocalOrderStatus(scopeKey, orderId, next),
    };
  }, [scopeKey]);
}