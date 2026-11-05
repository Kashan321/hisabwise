import type { AuthUser, Order } from '@/lib/api/types';
import { hasAnyPermission, isWaiterOnly } from '@/lib/auth/permissions';

/** Managers, cashiers, and owners may assign who took the order; pure waiters are auto-assigned. */
export function canAssignOrderTaker(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (hasAnyPermission(user, ['*', 'orders.manage'])) return true;
  return !isWaiterOnly(user);
}

/** Select option value when entering a name not in staff list. */
export const ORDER_TAKER_OTHER_VALUE = '__other__';

export type OrderTakerSelection = {
  staffId: string;
  customName: string;
};

export const EMPTY_ORDER_TAKER: OrderTakerSelection = { staffId: '', customName: '' };

export function orderTakerFromOrder(
  order: Pick<Order, 'waiterId' | 'waiterName'>,
): OrderTakerSelection {
  if (order.waiterId) {
    return { staffId: order.waiterId, customName: '' };
  }
  const name = order.waiterName?.trim() ?? '';
  if (name) {
    return { staffId: ORDER_TAKER_OTHER_VALUE, customName: name };
  }
  return EMPTY_ORDER_TAKER;
}

export function createOrderWaiterFields(
  selection: OrderTakerSelection,
): { waiterId?: string; waiterName?: string } {
  if (selection.staffId && selection.staffId !== ORDER_TAKER_OTHER_VALUE) {
    return { waiterId: selection.staffId };
  }
  const name = selection.customName.trim();
  if (name) return { waiterName: name };
  return {};
}

export function transferWaiterRequestBody(selection: OrderTakerSelection): {
  waiterId: string | null;
  waiterName: string | null;
} {
  if (selection.staffId && selection.staffId !== ORDER_TAKER_OTHER_VALUE) {
    return { waiterId: selection.staffId, waiterName: null };
  }
  const name = selection.customName.trim();
  if (name) return { waiterId: null, waiterName: name };
  return { waiterId: null, waiterName: null };
}

export function orderTakerSelectValue(selection: OrderTakerSelection): string {
  if (selection.staffId && selection.staffId !== ORDER_TAKER_OTHER_VALUE) {
    return selection.staffId;
  }
  if (selection.staffId === ORDER_TAKER_OTHER_VALUE || selection.customName.trim()) {
    return ORDER_TAKER_OTHER_VALUE;
  }
  return '';
}
