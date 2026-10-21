import type { Order } from '@/lib/api/types';

/** Customer-facing order label: ticket number (e.g. KB-260917-001) or short id fallback. */
export function formatOrderLabel(
  order: Pick<Order, 'id' | 'ticketLabel' | 'ticketNumber' | 'ticketPrefix'> | string,
): string {
  if (typeof order === 'string') {
    return `#${order.slice(0, 8)}`;
  }

  if (order.ticketLabel) return order.ticketLabel;

  if (order.ticketNumber != null && order.ticketPrefix) {
    return `${order.ticketPrefix.toUpperCase()}-${String(order.ticketNumber).padStart(3, '0')}`;
  }

  return `#${order.id.slice(0, 8)}`;
}

/** Short ticket id for dense POS lists (e.g. #005). Falls back to full label when needed. */
export function formatOrderShortLabel(
  order: Pick<Order, 'id' | 'ticketLabel' | 'ticketNumber' | 'ticketPrefix'> | string,
): string {
  if (typeof order === 'string') {
    return `#${order.slice(0, 4)}`;
  }

  if (order.ticketNumber != null) {
    return `#${String(order.ticketNumber).padStart(3, '0')}`;
  }

  const full = formatOrderLabel(order);
  const suffix = full.match(/-(\d{3,})$/);
  if (suffix) return `#${suffix[1]}`;

  return full.length > 14 ? `#${full.slice(-4)}` : full;
}

/** Staff member who created / took the order (POS, waiter, counter). */
export function orderTakerName(
  order: Pick<Order, 'createdByName' | 'waiterName'>,
): string | null {
  return order.createdByName ?? order.waiterName ?? null;
}
