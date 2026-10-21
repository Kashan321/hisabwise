import type { MenuItem, ModifierGroup, InventoryAvailabilityMap } from '@/lib/api/types';

export interface CartLine {
  menuItemId: string;
  variantId?: string | null;
  modifierOptionIds: string[];
  quantity: number;
}

export interface CartLineSelection {
  variantId?: string | null;
  modifierOptionIds: string[];
}

export function cartLineKey(
  menuItemId: string,
  modifierOptionIds: string[],
  variantId?: string | null,
) {
  const mods = [...modifierOptionIds].sort().join(',');
  const variant = variantId ?? '';
  if (!variant && !mods) return menuItemId;
  return `${menuItemId}:${variant}:${mods}`;
}

export function itemNeedsCustomization(item: MenuItem): boolean {
  const hasVariants = (item.variants?.length ?? 0) > 0;
  const hasModifiers = (item.modifierGroups?.length ?? 0) > 0;
  return hasVariants || hasModifiers;
}

export function getItemDisplayPrice(item: MenuItem): number {
  const availableVariants = item.variants?.filter((variant) => variant.isAvailable) ?? [];
  if (availableVariants.length > 0) {
    return Math.min(...availableVariants.map((variant) => Number(variant.price)));
  }
  return Number(item.price);
}

export function itemHasVariants(item: MenuItem): boolean {
  return (item.variants?.length ?? 0) > 0;
}

export function lineUnitPrice(
  item: MenuItem,
  modifierOptionIds: string[],
  variantId?: string | null,
): number {
  let base = Number(item.price);
  if (variantId) {
    const variant = item.variants?.find((entry) => entry.id === variantId);
    if (variant) base = Number(variant.price);
  }
  const modifierTotal = modifierOptionIds.reduce((sum, optionId) => {
    for (const group of item.modifierGroups ?? []) {
      const option = group.options.find((entry) => entry.id === optionId);
      if (option) return sum + Number(option.priceAdjustment);
    }
    return sum;
  }, 0);
  return base + modifierTotal;
}

export function modifierLabels(item: MenuItem, modifierOptionIds: string[]): string[] {
  return modifierOptionIds
    .map((optionId) => {
      for (const group of item.modifierGroups ?? []) {
        const option = group.options.find((entry) => entry.id === optionId);
        if (option) return option.name;
      }
      return null;
    })
    .filter(Boolean) as string[];
}

export function variantLabel(item: MenuItem, variantId?: string | null): string | null {
  if (!variantId) return null;
  return item.variants?.find((entry) => entry.id === variantId)?.name ?? null;
}

export function formatCartLineSummary(
  item: MenuItem,
  selection: CartLineSelection,
): string[] {
  const lines: string[] = [];
  const variant = variantLabel(item, selection.variantId);
  if (variant) lines.push(variant);
  lines.push(...modifierLabels(item, selection.modifierOptionIds));
  return lines;
}

export function isCustomizationValid(item: MenuItem, selection: CartLineSelection): boolean {
  const hasVariants = itemHasVariants(item);
  if (hasVariants && !selection.variantId) return false;
  if (!hasVariants && selection.variantId) return false;

  for (const group of item.modifierGroups ?? []) {
    const picks = selection.modifierOptionIds.filter((optionId) =>
      group.options.some((option) => option.id === optionId),
    );
    const minRequired = group.isRequired ? Math.max(1, group.minSelect) : group.minSelect;
    if (picks.length < minRequired) return false;
    if (picks.length > group.maxSelect) return false;
  }

  return true;
}

export function isSellableInventoryOk(
  map: InventoryAvailabilityMap | undefined,
  menuItemId: string,
  variantId?: string | null,
  modifierOptionIds?: string[],
): boolean {
  if (!map) return true;

  const itemAvail = map.menuItems[menuItemId];
  if (itemAvail?.status === 'out_of_stock') return false;

  if (variantId) {
    const variantAvail = map.variants[variantId];
    if (variantAvail?.status === 'out_of_stock') return false;
  }

  for (const optionId of modifierOptionIds ?? []) {
    const modAvail = map.modifierOptions[optionId];
    if (modAvail?.status === 'out_of_stock') return false;
  }

  return true;
}

export function inventoryStatusLabel(
  map: InventoryAvailabilityMap | undefined,
  menuItemId: string,
  variantId?: string | null,
): string | null {
  if (!map) return null;
  if (variantId && map.variants[variantId]?.status === 'out_of_stock') return 'Out of stock (None left)';
  if (map.menuItems[menuItemId]?.status === 'out_of_stock') return 'Out of stock (None left)';
  if (variantId && map.variants[variantId]?.status === 'low') return 'Low stock (Running low)';
  if (map.menuItems[menuItemId]?.status === 'low') return 'Low stock (Running low)';
  return null;
}

export function isCartLineValid(
  item: MenuItem | undefined,
  line: CartLine,
  inventoryAvailability?: InventoryAvailabilityMap,
): boolean {
  if (!item || !item.isAvailable || line.quantity <= 0) return false;

  if (
    !isSellableInventoryOk(
      inventoryAvailability,
      line.menuItemId,
      line.variantId,
      line.modifierOptionIds,
    )
  ) {
    return false;
  }

  const hasVariants = itemHasVariants(item);
  if (hasVariants) {
    if (!line.variantId) return false;
    const variant = item.variants?.find((entry) => entry.id === line.variantId);
    if (!variant?.isAvailable) return false;
  } else if (line.variantId) {
    return false;
  }

  if (!isCustomizationValid(item, {
    variantId: line.variantId,
    modifierOptionIds: line.modifierOptionIds,
  })) {
    return false;
  }

  for (const optionId of line.modifierOptionIds) {
    let found = false;
    for (const group of item.modifierGroups ?? []) {
      const option = group.options.find((entry) => entry.id === optionId);
      if (option) {
        if (!option.isAvailable) return false;
        found = true;
        break;
      }
    }
    if (!found) return false;
  }

  return true;
}

export function groupSelectionHint(group: ModifierGroup): string {
  if (group.maxSelect <= 1) {
    return group.isRequired ? 'Required · Choose one' : 'Optional · Choose one';
  }
  if (group.isRequired) {
    return `Required · Choose ${group.minSelect}–${group.maxSelect}`;
  }
  return `Optional · Choose up to ${group.maxSelect}`;
}
