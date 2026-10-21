import type { CartLine } from '@/lib/cart-line';
import { cartLineKey } from '@/lib/cart-line';
import { STORAGE_KEY_PREFIX } from '@/lib/config';

export type PosOrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export interface PosDraft {
  cart: CartLine[];
  orderMode: PosOrderMode;
  tableId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes: string;
  promotionId: string;
  discountType: '' | 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  taxRatePercent: string;
  taxRateCustomized?: boolean;
  serviceRatePercent: string;
  orderNotes: string;
  updatedAt: number;
}

function draftKey(slug: string, waiterMode?: boolean) {
  const scope = waiterMode ? 'waiter' : 'staff';
  return `${STORAGE_KEY_PREFIX}-pos-draft:${slug}:${scope}`;
}

export function cartRecordFromLines(lines: CartLine[]): Record<string, CartLine> {
  const record: Record<string, CartLine> = {};
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const key = cartLineKey(line.menuItemId, line.modifierOptionIds, line.variantId);
    record[key] = line;
  }
  return record;
}

export function cartLinesFromRecord(record: Record<string, CartLine>): CartLine[] {
  return Object.values(record).filter((line) => line.quantity > 0);
}

export function loadPosDraft(slug: string, waiterMode?: boolean): PosDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(draftKey(slug, waiterMode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PosDraft>;
    if (!parsed || !Array.isArray(parsed.cart)) return null;
    return {
      cart: parsed.cart.filter((line) => line.quantity > 0),
      orderMode:
        parsed.orderMode && ['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(parsed.orderMode)
          ? parsed.orderMode
          : 'DINE_IN',
      tableId: parsed.tableId ?? '',
      customerId: parsed.customerId ?? '',
      customerName: parsed.customerName ?? '',
      customerPhone: parsed.customerPhone ?? '',
      deliveryAddress: parsed.deliveryAddress ?? '',
      deliveryNotes: parsed.deliveryNotes ?? '',
      promotionId: parsed.promotionId ?? '',
      discountType:
        parsed.discountType === 'PERCENTAGE' || parsed.discountType === 'FIXED'
          ? parsed.discountType
          : '',
      discountValue: parsed.discountValue ?? '',
      taxRatePercent: parsed.taxRatePercent ?? '',
      taxRateCustomized: parsed.taxRateCustomized === true,
      serviceRatePercent: parsed.serviceRatePercent ?? '',
      orderNotes: parsed.orderNotes ?? '',
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function savePosDraft(slug: string, draft: Omit<PosDraft, 'updatedAt'>, waiterMode?: boolean) {
  if (typeof window === 'undefined') return;
  const lines = draft.cart.filter((line) => line.quantity > 0);
  if (lines.length === 0) {
    clearPosDraft(slug, waiterMode);
    return;
  }
  const payload: PosDraft = {
    ...draft,
    cart: lines,
    updatedAt: Date.now(),
  };
  localStorage.setItem(draftKey(slug, waiterMode), JSON.stringify(payload));
}

export function clearPosDraft(slug: string, waiterMode?: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(draftKey(slug, waiterMode));
}

export function countPosDraftItems(slug: string, waiterMode?: boolean): number {
  const draft = loadPosDraft(slug, waiterMode);
  if (!draft) return 0;
  return draft.cart.reduce((sum, line) => sum + line.quantity, 0);
}
