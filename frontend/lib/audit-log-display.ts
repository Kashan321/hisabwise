const ACTION_LABELS: Record<string, string> = {
  'order.items_added': 'Items added to order',
  'order.pricing_updated': 'Order pricing updated',
  'order.items_removed': 'Items removed from order',
  'order.sent_to_kitchen': 'Order sent to kitchen',
  'order.waiter_transferred': 'Waiter transferred on order',
  'order.change_request_created': 'Order change request submitted',
  'order.change_request_reviewed': 'Order change request reviewed',
  'order.table_transferred': 'Order moved to another table',
  'order.tables_merged': 'Orders merged',
  'order.cancelled': 'Order cancelled',
  'delivery.rider_assigned': 'Rider assigned to delivery',
  'delivery.status_updated': 'Delivery status updated',
  'table.waiter_assigned': 'Waiter assigned to table',
  'table.waiter_unassigned': 'Waiter unassigned from table',
  'table.freed': 'Table marked free',
};

export function formatTenantAuditAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function auditLogIcon(action: string): string {
  if (action.startsWith('order.')) return 'receipt_long';
  if (action.startsWith('delivery.')) return 'delivery_dining';
  if (action.startsWith('table.')) return 'table_restaurant';
  return 'history';
}
