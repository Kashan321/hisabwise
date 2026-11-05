import type { MenuItem, ModifierGroup } from '@/lib/api/types';
import { itemHasVariants } from '@/lib/cart-line';
import { menuItemIsByWeight } from '@/lib/order-item-display';

export type MenuItemCustomizeStep =
  | { kind: 'weight' }
  | { kind: 'variant' }
  | { kind: 'modifiers'; group: ModifierGroup };

export function buildMenuItemCustomizeSteps(item: MenuItem): MenuItemCustomizeStep[] {
  const steps: MenuItemCustomizeStep[] = [];
  if (menuItemIsByWeight(item)) steps.push({ kind: 'weight' });
  if (!menuItemIsByWeight(item) && itemHasVariants(item)) steps.push({ kind: 'variant' });
  for (const group of item.modifierGroups ?? []) {
    steps.push({ kind: 'modifiers', group });
  }
  return steps;
}

export function menuItemCustomizeStepLabel(step: MenuItemCustomizeStep): string {
  switch (step.kind) {
    case 'weight':
      return 'Choose portion';
    case 'variant':
      return 'Choose size';
    case 'modifiers':
      return step.group.name;
  }
}

export function modifierGroupStepValid(group: ModifierGroup, optionIds: string[]): boolean {
  const minRequired = group.isRequired ? Math.max(1, group.minSelect) : group.minSelect;
  return optionIds.length >= minRequired && optionIds.length <= group.maxSelect;
}

export function itemNeedsConfigureFlow(item: MenuItem): boolean {
  return buildMenuItemCustomizeSteps(item).length > 0;
}
