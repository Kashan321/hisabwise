import type { Order } from '@/lib/api/types';

export function sumOrderLineSubtotal(items: Order['items']): number {
  return (items ?? []).reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0);
}

export function recalculateReceiptOrderTotals(
  order: Order,
  rates: { taxRate?: number; serviceRate?: number },
): Order {
  const subtotal = sumOrderLineSubtotal(order.items);
  const discountAmount = Number(order.discountAmount ?? 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = rates.taxRate ?? 0;
  const serviceRate = rates.serviceRate ?? 0;
  const taxAmount = taxable * taxRate;
  const serviceAmount = taxable * serviceRate;
  const deliveryAmount = Number(order.deliveryAmount ?? 0);
  const totalAmount = taxable + taxAmount + serviceAmount + deliveryAmount;
  return {
    ...order,
    subtotal: String(subtotal),
    taxAmount: String(taxAmount),
    serviceAmount: String(serviceAmount),
    totalAmount: String(totalAmount),
  } as Order;
}

export function ratesFromCreatePayload(payload: Record<string, unknown> | undefined) {
  return {
    taxRate: typeof payload?.taxRate === 'number' ? payload.taxRate : undefined,
    serviceRate: typeof payload?.serviceRate === 'number' ? payload.serviceRate : undefined,
  };
}