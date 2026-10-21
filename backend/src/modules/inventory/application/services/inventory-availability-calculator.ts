import type { InventoryTrackingMode, InventoryUnit } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import { convertToBaseUnit } from './inventory-unit';

export type InventoryAvailabilityStatus = 'available' | 'low' | 'out_of_stock' | 'not_tracked';

export type SellableAvailability = {
  status: InventoryAvailabilityStatus;
  availableUnits?: number;
};

export class InventoryAvailabilityCalculator {
  async getMenuAvailability(businessId: string): Promise<{
    menuItems: Record<string, SellableAvailability>;
    variants: Record<string, SellableAvailability>;
    modifierOptions: Record<string, SellableAvailability>;
  }> {
    const items = await prisma.inventoryItem.findMany({
      where: { businessId, isActive: true },
    });
    const stockMap = new Map(items.map((i) => [i.id, Number(i.currentQuantity)]));
    const thresholdMap = new Map(items.map((i) => [i.id, i.minThreshold ? Number(i.minThreshold) : null]));

    const menuItems = await prisma.menuItem.findMany({
      where: { businessId },
      include: {
        inventoryRecipe: { include: { lines: { include: { inventoryItem: true } } } },
        variants: {
          include: {
            inventoryRecipe: { include: { lines: { include: { inventoryItem: true } } } },
          },
        },
      },
    });

    const modifierOptions = await prisma.modifierOption.findMany({
      where: { modifierGroup: { businessId } },
      include: {
        inventoryRecipe: { include: { lines: { include: { inventoryItem: true } } } },
      },
    });

    const menuItemMap: Record<string, SellableAvailability> = {};
    const variantMap: Record<string, SellableAvailability> = {};
    const modifierMap: Record<string, SellableAvailability> = {};

    for (const item of menuItems) {
      if (item.variants.length > 0) {
        menuItemMap[item.id] = { status: 'not_tracked' };
        for (const variant of item.variants) {
          variantMap[variant.id] = this.computeSellableAvailability(
            variant.inventoryTrackingMode,
            variant.inventoryItemId,
            variant.inventoryRecipe?.lines ?? [],
            stockMap,
            thresholdMap,
          );
        }
      } else {
        menuItemMap[item.id] = this.computeSellableAvailability(
          item.inventoryTrackingMode,
          item.inventoryItemId,
          item.inventoryRecipe?.lines ?? [],
          stockMap,
          thresholdMap,
        );
      }
    }

    for (const option of modifierOptions) {
      modifierMap[option.id] = this.computeSellableAvailability(
        option.inventoryTrackingMode,
        option.inventoryItemId,
        option.inventoryRecipe?.lines ?? [],
        stockMap,
        thresholdMap,
      );
    }

    return { menuItems: menuItemMap, variants: variantMap, modifierOptions: modifierMap };
  }

  computeSellableAvailability(
    trackingMode: InventoryTrackingMode,
    inventoryItemId: string | null,
    recipeLines: Array<{
      inventoryItemId: string;
      quantity: { toString(): string } | number;
      unit: InventoryUnit;
      inventoryItem: { unit: InventoryUnit };
    }>,
    stockMap: Map<string, number>,
    thresholdMap: Map<string, number | null>,
  ): SellableAvailability {
    if (trackingMode === 'NONE') {
      return { status: 'not_tracked' };
    }

    if (trackingMode === 'SIMPLE_STOCK' && inventoryItemId) {
      const stock = stockMap.get(inventoryItemId) ?? 0;
      const threshold = thresholdMap.get(inventoryItemId);
      const availableUnits = Math.floor(stock);
      if (availableUnits <= 0) return { status: 'out_of_stock', availableUnits: 0 };
      if (threshold !== null && threshold !== undefined && stock <= threshold) {
        return { status: 'low', availableUnits };
      }
      return { status: 'available', availableUnits };
    }

    if (trackingMode === 'RECIPE' && recipeLines.length > 0) {
      let minUnits = Infinity;
      for (const line of recipeLines) {
        const stock = stockMap.get(line.inventoryItemId) ?? 0;
        const perUnit = convertToBaseUnit(
          Number(line.quantity),
          line.unit,
          line.inventoryItem.unit,
        );
        if (perUnit <= 0) continue;
        const units = Math.floor(stock / perUnit);
        minUnits = Math.min(minUnits, units);
      }
      if (minUnits === Infinity || minUnits <= 0) {
        return { status: 'out_of_stock', availableUnits: 0 };
      }
      return { status: 'available', availableUnits: minUnits };
    }

    return { status: 'not_tracked' };
  }

  isSellableInventoryAvailable(
    availability: SellableAvailability,
    requestedQuantity = 1,
  ): boolean {
    if (availability.status === 'not_tracked') return true;
    if (availability.status === 'out_of_stock') return false;
    if (availability.availableUnits !== undefined && availability.availableUnits < requestedQuantity) {
      return false;
    }
    return true;
  }
}

export const inventoryAvailabilityCalculator = new InventoryAvailabilityCalculator();
