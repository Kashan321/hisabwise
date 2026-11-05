import type { Order } from '@/lib/api/types';

function resolveTableName(
  order: Pick<Order, 'tableId' | 'tableIdentifier'>,
  tableMap?: Record<string, string>,
): string | null {
  const fromOrder = order.tableIdentifier?.trim();
  if (fromOrder) return fromOrder;
  if (order.tableId && tableMap?.[order.tableId]?.trim()) {
    return tableMap[order.tableId].trim();
  }
  return null;
}

/** Service location line for kitchen tickets (no fake "BAR" fallback). */
export function resolveKitchenServiceLine(
  order: Pick<Order, 'orderType' | 'tableId' | 'tableIdentifier' | 'source'>,
  tableMap?: Record<string, string>,
): string {
  if (order.orderType === 'DELIVERY') return 'Delivery';
  if (order.orderType === 'TAKEAWAY') return 'Takeaway';

  const table = resolveTableName(order, tableMap);
  if (table) return table;

  if (order.source === 'QR_CUSTOMER') return 'QR Order';
  if (order.orderType === 'DINE_IN') return 'Dine-In';
  return 'Counter';
}

/** KDS card headline — table name when seated, otherwise channel label. */
export function resolveKitchenBoardTableLabel(
  order: Pick<Order, 'orderType' | 'tableId' | 'tableIdentifier' | 'source' | 'status'>,
  tableMap?: Record<string, string>,
): string {
  const table = resolveTableName(order, tableMap);
  if (table) return table;

  if (order.orderType === 'DELIVERY') return 'Delivery';
  if (order.orderType === 'TAKEAWAY') return 'Takeaway';
  if (order.status === 'READY') return 'Pickup';
  return 'Counter';
}
