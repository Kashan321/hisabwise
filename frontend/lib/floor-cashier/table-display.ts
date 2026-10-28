import type { FloorTable, Order } from '@/lib/api/types';

/** Cashier-facing table status (plain English). */
export type CashierTableStatus = 'free' | 'busy' | 'bill_printed' | 'reserved';

export function normalizeTableIdentifier(id: string): string {
  return id.trim().toUpperCase();
}

export function resolveCashierTableStatus(
  table: FloorTable,
  order?: Order | null,
): CashierTableStatus {
  if (table.status === 'RESERVED') return 'reserved';
  if (order && !['COMPLETED', 'CANCELLED'].includes(order.status)) {
    if (order.status === 'READY') return 'bill_printed';
    return 'busy';
  }
  if (table.status === 'OCCUPIED') return 'busy';
  return 'free';
}

export const CASHIER_STATUS_LABEL: Record<CashierTableStatus, string> = {
  free: 'Free',
  busy: 'Busy',
  bill_printed: 'Bill printed',
  reserved: 'Reserved',
};

export const CASHIER_STATUS_CARD_CLASS: Record<CashierTableStatus, string> = {
  free: 'bg-emerald-50 border-emerald-300 text-emerald-950',
  busy: 'bg-orange-100 border-orange-400 text-orange-950',
  bill_printed: 'bg-sky-100 border-sky-500 text-sky-950',
  reserved: 'bg-violet-100 border-violet-400 text-violet-950',
};

export const CASHIER_STATUS_BADGE_CLASS: Record<CashierTableStatus, string> = {
  free: 'bg-emerald-600 text-white',
  busy: 'bg-orange-600 text-white',
  bill_printed: 'bg-sky-700 text-white',
  reserved: 'bg-violet-700 text-white',
};

export function minutesSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60_000));
}

export function formatMinutesSeated(iso: string): string {
  const m = minutesSince(iso);
  if (m < 1) return 'Just seated';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function isOpenDineInOrder(order: Order): boolean {
  return (
    (order.orderType === 'DINE_IN' || !order.orderType) &&
    !!order.tableId &&
    !['COMPLETED', 'CANCELLED'].includes(order.status) &&
    !order.isDraft
  );
}

export function buildActiveOrderByTable(orders: Order[]): Record<string, Order> {
  const map: Record<string, Order> = {};
  for (const order of orders) {
    if (!isOpenDineInOrder(order) || !order.tableId) continue;
    if (!map[order.tableId]) map[order.tableId] = order;
  }
  return map;
}

export function floorHeaderStats(
  tables: FloorTable[],
  activeOrderByTable: Record<string, Order>,
): { busyCount: number; totalTables: number; openBillTotal: number } {
  let busyCount = 0;
  let openBillTotal = 0;
  for (const table of tables) {
    const order = activeOrderByTable[table.id];
    const status = resolveCashierTableStatus(table, order);
    if (status === 'busy' || status === 'bill_printed' || status === 'reserved') {
      busyCount += 1;
    }
    if (order) openBillTotal += Number(order.totalAmount) || 0;
  }
  return { busyCount, totalTables: tables.length, openBillTotal };
}
