import type { QueryClient } from '@tanstack/react-query';

/** Maps domain events to React Query keys that should refresh. */
const EVENT_QUERY_KEYS: Record<string, readonly (readonly string[])[]> = {
  'order.placed': [
    ['kitchen', 'queue'],
    ['orders'],
    ['waiter'],
    ['delivery'],
    ['floor-plan', 'tables'],
  ],
  'order.status_changed': [
    ['kitchen', 'queue'],
    ['orders'],
    ['waiter'],
    ['delivery'],
    ['rider'],
    ['floor-plan', 'tables'],
  ],
  'order.items_added': [['orders'], ['kitchen', 'queue'], ['waiter']],
  'order.items_removed': [['orders'], ['kitchen', 'queue'], ['waiter']],
  'order.delivery_updated': [['delivery'], ['orders'], ['rider'], ['waiter']],
  'order.rider_assigned': [['delivery'], ['orders'], ['rider'], ['waiter']],
  'order.waiter_transferred': [['waiter'], ['orders']],
  'order.table_transferred': [['orders'], ['floor-plan', 'tables'], ['floor-plan', 'scene']],
  'order.tables_merged': [['orders'], ['floor-plan', 'tables'], ['floor-plan', 'scene']],
  'order.change_request_created': [['orders'], ['waiter']],
  'order.change_request_reviewed': [['orders'], ['waiter']],
  'table.status_changed': [['floor-plan', 'tables'], ['floor-plan', 'scene'], ['waiter']],
  'table.waiter_assigned': [['waiter']],
  'reservation.created': [['reservations']],
  'reservation.cancelled': [['reservations']],
  'promotion.activated': [['promotions']],
  'promotion.broadcast': [['promotions']],
  'loyalty.points_earned': [['customers']],
  'inventory.stock_changed': [['inventory'], ['menu']],
  'inbox.notification_created': [['notifications']],
};

export function invalidateQueriesForTenantEvent(qc: QueryClient, event?: string) {
  if (!event) return;

  const keys = EVENT_QUERY_KEYS[event];
  if (!keys) return;

  for (const queryKey of keys) {
    void qc.invalidateQueries({ queryKey: [...queryKey] });
  }
}

/** Legacy kitchen.updated messages from older server builds. */
export function invalidateQueriesForLegacyKitchenMessage(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['kitchen', 'queue'] });
  void qc.invalidateQueries({ queryKey: ['orders'] });
}
