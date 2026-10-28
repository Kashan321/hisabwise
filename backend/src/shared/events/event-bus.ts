import { EventEmitter2 } from 'eventemitter2';

export const eventBus = new EventEmitter2({
  wildcard: false,
  delimiter: '.',
  newListener: false,
  maxListeners: 20,
});

export type DomainEventMap = {
  'user.registered': { userId: string; businessId: string };
  'user.logged_in': { userId: string; businessId: string };
  'order.placed': { orderId: string; businessId: string };
  'order.status_changed': {
    orderId: string;
    businessId: string;
    status: string;
    customerId?: string | null;
    totalAmount?: string;
    paymentMethod?: string | null;
    paymentStatus?: string | null;
  };
  'order.items_added': { orderId: string; businessId: string };
  'order.pricing_updated': { orderId: string; businessId: string };
  'order.items_removed': { orderId: string; businessId: string };
  'order.delivery_updated': {
    orderId: string;
    businessId: string;
    deliveryStatus: string;
  };
  'order.rider_assigned': { orderId: string; businessId: string; riderId: string };
  'order.waiter_transferred': { orderId: string; businessId: string; waiterId: string };
  'order.table_transferred': {
    orderId: string;
    businessId: string;
    targetTableId: string;
    sourceTableId: string;
  };
  'order.tables_merged': {
    businessId: string;
    targetOrderId: string;
    sourceOrderId: string;
    sourceTableId: string;
  };
  'order.change_request_created': {
    orderId: string;
    businessId: string;
    requestId: string;
  };
  'order.change_request_reviewed': {
    orderId: string;
    businessId: string;
    requestId: string;
    status: string;
  };
  'table.status_changed': { tableId: string; businessId: string; status: string };
  'table.waiter_assigned': {
    tableId: string;
    businessId: string;
    waiterId: string | null;
  };
  'reservation.created': { reservationId: string; businessId: string };
  'reservation.cancelled': { reservationId: string; businessId: string };
  'promotion.activated': { promotionId: string; businessId: string };
  'promotion.broadcast': { promotionId: string; businessId: string };
  'loyalty.points_earned': { customerId: string; businessId: string; points: number };
  'inventory.stock_changed': {
    businessId: string;
    orderId?: string;
    inventoryItemId?: string;
  };
  'inbox.notification_created': {
    businessId: string;
    userId: string;
    notificationId: string;
    category: string;
    title: string;
    body: string;
    actionHref?: string | null;
  };
};

export function emitDomainEvent<K extends keyof DomainEventMap>(
  event: K,
  payload: DomainEventMap[K],
) {
  eventBus.emit(event, payload);
}
