import type { Order } from '@/lib/api/types';

type OpenTabOrder = Pick<Order, 'id' | 'isDraft' | 'orderType' | 'status' | 'tableId' | 'sentToKitchenAt'>;
type OrderPricingOrder = Pick<Order, 'status' | 'paymentStatus'>;

const OPEN_TAB_TYPES = new Set(['DINE_IN', 'TAKEAWAY']);
const ADD_ITEMS_STATUSES = new Set(['RECEIVED', 'PREPARING', 'READY']);

export function canAddItemsToOpenTab(order: OpenTabOrder): boolean {
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;
  if (order.isDraft || !order.sentToKitchenAt) return true;
  if (!order.orderType || !OPEN_TAB_TYPES.has(order.orderType)) return false;
  return ADD_ITEMS_STATUSES.has(order.status);
}

/** Open orders can get promotions / manual discount even when line items are locked. */
export function canUpdateOrderPricing(order: OrderPricingOrder): boolean {
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;
  if (order.paymentStatus === 'PAID') return false;
  return true;
}

export function posAddItemsHref(
  slug: string,
  order: Pick<Order, 'id' | 'tableId'>,
  basePath: 'orders' | 'waiter/orders' = 'orders',
): string {
  const params = new URLSearchParams({ orderId: order.id });
  if (order.tableId) params.set('tableId', order.tableId);
  return `/${slug}/${basePath}/new?${params.toString()}`;
}

export function isOpenTabOrderType(orderType?: Order['orderType']): boolean {
  return orderType != null && OPEN_TAB_TYPES.has(orderType);
}
