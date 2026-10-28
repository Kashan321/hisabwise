import type { InventoryTrackingMode, InventoryUnit, Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import { convertToBaseUnit } from './inventory-unit';

export type OrderLineConsumptionInput = {
  menuItemId: string;
  variantId?: string | null;
  quantity: number;
  weightG?: number | null;
  modifierOptionIds: string[];
};

export type ConsumptionLine = {
  inventoryItemId: string;
  quantityDelta: number; // in storage unit of the inventory item
};

type TrackingConfig = {
  trackingMode: InventoryTrackingMode;
  inventoryItemId: string | null;
  recipeLines: Array<{ inventoryItemId: string; quantity: number; unit: InventoryUnit; storageUnit: InventoryUnit }>;
};

const recipeInclude = {
  inventoryRecipe: { include: { lines: { include: { inventoryItem: true } } } },
} as const;

export class InventoryConsumptionCalculator {
  async calculateForOrderLines(
    businessId: string,
    lines: OrderLineConsumptionInput[],
  ): Promise<ConsumptionLine[]> {
    if (lines.length === 0) return [];

    const menuItemIds = [...new Set(lines.map((l) => l.menuItemId))];
    const variantIds = [...new Set(lines.map((l) => l.variantId).filter((id): id is string => !!id))];
    const modifierIds = [...new Set(lines.flatMap((l) => l.modifierOptionIds))];

    const [menuItems, variants, modifierOptions] = await Promise.all([
      prisma.menuItem.findMany({
        where: { businessId, id: { in: menuItemIds } },
        include: recipeInclude,
      }),
      variantIds.length > 0
        ? prisma.menuItemVariant.findMany({
            where: { id: { in: variantIds } },
            include: recipeInclude,
          })
        : Promise.resolve([]),
      modifierIds.length > 0
        ? prisma.modifierOption.findMany({
            where: { id: { in: modifierIds }, modifierGroup: { businessId } },
            include: recipeInclude,
          })
        : Promise.resolve([]),
    ]);

    const itemMap = new Map(
      menuItems.map((item) => [
        item.id,
        this.mapTrackingConfig(
          item.inventoryTrackingMode,
          item.inventoryItemId,
          item.inventoryRecipe,
        ),
      ]),
    );
    const variantMap = new Map(
      variants.map((variant) => [
        variant.id,
        this.mapTrackingConfig(
          variant.inventoryTrackingMode,
          variant.inventoryItemId,
          variant.inventoryRecipe,
        ),
      ]),
    );
    const modifierMap = new Map(
      modifierOptions.map((option) => [
        option.id,
        this.mapTrackingConfig(
          option.inventoryTrackingMode,
          option.inventoryItemId,
          option.inventoryRecipe,
        ),
      ]),
    );

    const aggregated = new Map<string, number>();

    for (const line of lines) {
      const consumptionUnits =
        line.weightG != null ? (line.weightG / 1000) * line.quantity : line.quantity;
      const baseConfig = line.variantId
        ? variantMap.get(line.variantId)
        : itemMap.get(line.menuItemId);
      this.addTrackingConsumption(aggregated, baseConfig ?? null, consumptionUnits);

      for (const modifierOptionId of line.modifierOptionIds) {
        this.addTrackingConsumption(
          aggregated,
          modifierMap.get(modifierOptionId) ?? null,
          line.quantity,
        );
      }
    }

    return Array.from(aggregated.entries()).map(([inventoryItemId, quantityDelta]) => ({
      inventoryItemId,
      quantityDelta,
    }));
  }

  async calculateForSingleLine(
    businessId: string,
    line: OrderLineConsumptionInput,
  ): Promise<ConsumptionLine[]> {
    return this.calculateForOrderLines(businessId, [line]);
  }

  private addTrackingConsumption(
    aggregated: Map<string, number>,
    config: TrackingConfig | null,
    lineQuantity: number,
  ) {
    if (!config || config.trackingMode === 'NONE') return;

    if (config.trackingMode === 'SIMPLE_STOCK' && config.inventoryItemId) {
      const delta = lineQuantity;
      aggregated.set(
        config.inventoryItemId,
        (aggregated.get(config.inventoryItemId) ?? 0) + delta,
      );
      return;
    }

    if (config.trackingMode === 'RECIPE') {
      for (const recipeLine of config.recipeLines) {
        const perUnit = convertToBaseUnit(
          recipeLine.quantity,
          recipeLine.unit,
          recipeLine.storageUnit,
        );
        const delta = perUnit * lineQuantity;
        aggregated.set(
          recipeLine.inventoryItemId,
          (aggregated.get(recipeLine.inventoryItemId) ?? 0) + delta,
        );
      }
    }
  }

  private mapTrackingConfig(
    trackingMode: InventoryTrackingMode,
    inventoryItemId: string | null,
    recipe: {
      lines: Array<{
        inventoryItemId: string;
        quantity: Prisma.Decimal;
        unit: InventoryUnit;
        inventoryItem: { unit: InventoryUnit };
      }>;
    } | null,
  ): TrackingConfig {
    return {
      trackingMode,
      inventoryItemId,
      recipeLines:
        recipe?.lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          quantity: Number(l.quantity),
          unit: l.unit,
          storageUnit: l.inventoryItem.unit,
        })) ?? [],
    };
  }
}

export const inventoryConsumptionCalculator = new InventoryConsumptionCalculator();
