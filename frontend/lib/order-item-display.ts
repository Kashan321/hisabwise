import type { MenuItem, OrderItem } from '@/lib/api/types';
import { formatWeightDisplay } from '@/lib/pricing/weight-line-pricing';

export function menuItemIsByWeight(item: Pick<MenuItem, 'pricingType'>): boolean {
  return item.pricingType === 'BY_WEIGHT';
}

export function formatOrderItemWeightLine(item: Pick<OrderItem, 'weightG' | 'unitPricePerKg'>): string | null {
  if (item.weightG == null) return null;
  const weight = formatWeightDisplay(item.weightG);
  if (item.unitPricePerKg != null && Number(item.unitPricePerKg) > 0) {
    return `${weight} @ ${Number(item.unitPricePerKg)}/kg`;
  }
  return weight;
}

export function formatOrderItemShortLabel(
  item: Pick<OrderItem, 'menuItemName' | 'quantity' | 'weightG' | 'variantName'>,
): string {
  const qtyPrefix = item.quantity > 1 ? `${item.quantity}× ` : '';
  const weight = item.weightG != null ? formatWeightDisplay(item.weightG) : null;
  if (weight) return `${qtyPrefix}${item.menuItemName} — ${weight}`;
  if (item.variantName) return `${qtyPrefix}${item.menuItemName} (${item.variantName})`;
  return `${qtyPrefix}${item.menuItemName}`;
}

export function formatOrderItemReceiptQtyLine(
  item: Pick<OrderItem, 'quantity' | 'unitPrice' | 'weightG' | 'unitPricePerKg' | 'variantName'>,
  formatMoney: (n: number | string) => string,
): string {
  if (item.weightG != null && item.unitPricePerKg != null) {
    return `${formatWeightDisplay(item.weightG)} × ${formatMoney(item.unitPricePerKg)}/kg`;
  }
  if (item.variantName) {
    return `${item.variantName} × ${item.quantity}`;
  }
  return `${item.quantity} × ${formatMoney(item.unitPrice)}`;
}
