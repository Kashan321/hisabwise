import type { CartLine } from '@/lib/cart-line';
import { cartLineKey } from '@/lib/cart-line';
import { STORAGE_KEY_PREFIX } from '@/lib/config';

/** @deprecated Legacy cart keyed only by menuItemId */
export type CartMap = Record<string, number>;

export interface TableContext {
  tableId: string;
  tableIdentifier: string;
}

function cartKey(slug: string) {
  return `${STORAGE_KEY_PREFIX}-cart:${slug}`;
}

function tableKey(slug: string) {
  return `${STORAGE_KEY_PREFIX}-table:${slug}`;
}

function migrateLegacyCart(raw: unknown): CartLine[] {
  if (Array.isArray(raw)) {
    return raw as CartLine[];
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, number>)
      .filter(([, quantity]) => quantity > 0)
      .map(([menuItemId, quantity]) => ({
        menuItemId,
        modifierOptionIds: [],
        quantity,
      }));
  }
  return [];
}

export function loadCart(slug: string): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(cartKey(slug));
    return raw ? migrateLegacyCart(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveCart(slug: string, cart: CartLine[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(cartKey(slug), JSON.stringify(cart));
}

export function clearCart(slug: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(cartKey(slug));
}

export function upsertCartLine(slug: string, line: CartLine, delta = 1): CartLine[] {
  const cart = loadCart(slug);
  const key = cartLineKey(line.menuItemId, line.modifierOptionIds, line.variantId);
  const existingIndex = cart.findIndex(
    (entry) =>
      cartLineKey(entry.menuItemId, entry.modifierOptionIds, entry.variantId) === key,
  );

  if (existingIndex === -1) {
    const next = delta > 0 ? [...cart, { ...line, quantity: delta }] : cart;
    saveCart(slug, next);
    return next;
  }

  const next = [...cart];
  const nextQty = next[existingIndex].quantity + delta;
  if (nextQty <= 0) {
    next.splice(existingIndex, 1);
  } else {
    next[existingIndex] = { ...next[existingIndex], quantity: nextQty };
  }
  saveCart(slug, next);
  return next;
}

export function updateCartLineQuantity(
  slug: string,
  lineKey: string,
  delta: number,
  cart?: CartLine[],
): CartLine[] {
  const current = cart ?? loadCart(slug);
  const next = current
    .map((line) => {
      const key = cartLineKey(line.menuItemId, line.modifierOptionIds, line.variantId);
      if (key !== lineKey) return line;
      return { ...line, quantity: line.quantity + delta };
    })
    .filter((line) => line.quantity > 0);
  saveCart(slug, next);
  return next;
}

export function replaceCartLine(
  slug: string,
  oldLineKey: string,
  line: CartLine,
  cart?: CartLine[],
): CartLine[] {
  const current = cart ?? loadCart(slug);
  const withoutOld = current.filter((entry) => {
    const key = cartLineKey(entry.menuItemId, entry.modifierOptionIds, entry.variantId);
    return key !== oldLineKey;
  });
  const newKey = cartLineKey(line.menuItemId, line.modifierOptionIds, line.variantId);
  const existingIndex = withoutOld.findIndex(
    (entry) =>
      cartLineKey(entry.menuItemId, entry.modifierOptionIds, entry.variantId) === newKey,
  );

  let next: CartLine[];
  if (existingIndex === -1) {
    next = [...withoutOld, line];
  } else {
    next = [...withoutOld];
    next[existingIndex] = {
      ...next[existingIndex],
      quantity: next[existingIndex].quantity + line.quantity,
    };
  }

  saveCart(slug, next);
  return next;
}

export function loadTableContext(slug: string): TableContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(tableKey(slug));
    return raw ? (JSON.parse(raw) as TableContext) : null;
  } catch {
    return null;
  }
}

export function saveTableContext(slug: string, ctx: TableContext) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(tableKey(slug), JSON.stringify(ctx));
}

export function clearTableContext(slug: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(tableKey(slug));
}

export function clearOrderSession(slug: string) {
  clearCart(slug);
  clearTableContext(slug);
}
