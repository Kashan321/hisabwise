import type { MenuItem } from '@/lib/api/types';

export function hasAvailableVariants(item: MenuItem): boolean {
  const variants = item.variants ?? [];
  if (variants.length === 0) return true;
  return variants.some((variant) => variant.isAvailable);
}

/** Whether the item can be sold on POS / QR (ignores inventory). */
export function isMenuItemCustomerSellable(item: MenuItem): boolean {
  return item.isAvailable && hasAvailableVariants(item);
}

export function getMenuItemAvailabilityLabel(item: MenuItem): string {
  if (!item.isAvailable) return 'Unavailable';
  if (!hasAvailableVariants(item)) return 'Unavailable (no sizes available)';
  return 'Available';
}

export function isMenuItemEditorAvailable(item: MenuItem): boolean {
  return item.isAvailable && hasAvailableVariants(item);
}
