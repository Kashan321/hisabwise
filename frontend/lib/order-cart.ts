import type { CartLine } from '@/lib/cart-line';
import type { Order } from '@/lib/api/types';
import { posAddItemsHref } from '@/lib/open-tab-order';
import { cartRecordFromLines } from '@/lib/pos-draft-storage';

export function orderItemsToCartLines(order: Order): CartLine[] {
  return (order.items ?? [])
    .filter((item) => item.menuItemId && item.quantity > 0)
    .map((item) => ({
      menuItemId: item.menuItemId!,
      variantId: item.variantId,
      modifierOptionIds: (item.modifiers ?? [])
        .map((modifier) => modifier.modifierOptionId ?? modifier.id)
        .filter((id): id is string => Boolean(id)),
      quantity: item.quantity,
    }));
}

export function orderToCartRecord(order: Order): Record<string, CartLine> {
  return cartRecordFromLines(orderItemsToCartLines(order));
}

/** Open a held (draft) bill on New Bill — same UX as a running open tab. */
export function heldOrderHref(
  slug: string,
  order: Pick<Order, 'id' | 'tableId'>,
  basePath: 'orders' | 'waiter/orders' = 'orders',
): string {
  return posAddItemsHref(slug, order, basePath);
}
