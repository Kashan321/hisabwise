import type { CartLine } from '@/lib/cart-line';
import { STORAGE_KEY_PREFIX } from '@/lib/config';

type OrderAddDraftStore = Record<string, { cart: CartLine[]; updatedAt: number }>;

function storageKey(slug: string) {
  return `${STORAGE_KEY_PREFIX}-pos-order-add-drafts:${slug}`;
}

function readStore(slug: string): OrderAddDraftStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OrderAddDraftStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(slug: string, store: OrderAddDraftStore) {
  if (typeof window === 'undefined') return;
  const pruned = Object.fromEntries(
    Object.entries(store).filter(([, entry]) =>
      entry.cart.some((line) => line.quantity > 0),
    ),
  );
  if (Object.keys(pruned).length === 0) {
    localStorage.removeItem(storageKey(slug));
    return;
  }
  localStorage.setItem(storageKey(slug), JSON.stringify(pruned));
}

export function countCartLines(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function summarizeOrderAddDraftCounts(slug: string): Record<string, number> {
  const store = readStore(slug);
  const counts: Record<string, number> = {};
  for (const [orderId, entry] of Object.entries(store)) {
    const n = countCartLines(entry.cart);
    if (n > 0) counts[orderId] = n;
  }
  return counts;
}

export function loadOrderAddDraftCart(slug: string, orderId: string): CartLine[] {
  const entry = readStore(slug)[orderId];
  if (!entry) return [];
  return entry.cart.filter((line) => line.quantity > 0);
}

export function saveOrderAddDraftCart(slug: string, orderId: string, cart: CartLine[]) {
  const lines = cart.filter((line) => line.quantity > 0);
  const store = readStore(slug);
  if (lines.length === 0) {
    delete store[orderId];
  } else {
    store[orderId] = { cart: lines, updatedAt: Date.now() };
  }
  writeStore(slug, store);
}

export function clearOrderAddDraft(slug: string, orderId: string) {
  const store = readStore(slug);
  if (!store[orderId]) return;
  delete store[orderId];
  writeStore(slug, store);
}
