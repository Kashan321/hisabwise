import type { InventoryTrackingMode, InventoryUnit } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  InvalidInventoryConfigError,
  InventoryItemNotFoundError,
} from '../../domain/errors/inventory.errors';
import { unitsCompatible } from '../../application/services/inventory-unit';
import {
  MenuItemNotFoundError,
  MenuItemVariantNotFoundError,
  ModifierOptionNotFoundError,
} from '../../../menu/domain/errors/menu.errors';

export type RecipeLineInput = {
  inventoryItemId: string;
  quantity: number;
  unit: InventoryUnit;
};

export type SellableInventoryInput = {
  trackingMode: InventoryTrackingMode;
  inventoryItemId?: string | null;
  recipeLines?: RecipeLineInput[];
};

export class UpdateSellableInventoryUseCase {
  async updateMenuItem(businessId: string, menuItemId: string, input: SellableInventoryInput) {
    const item = await prisma.menuItem.findFirst({
      where: { id: menuItemId, businessId },
      include: { variants: { select: { id: true } } },
    });
    if (!item) throw new MenuItemNotFoundError();

    if (input.trackingMode === 'SIMPLE_STOCK' && item.variants.length > 0) {
      throw new InvalidInventoryConfigError(
        'Cannot use simple stock on a menu item that has variants. Configure inventory per variant instead.',
      );
    }

    await this.validateAndApply(businessId, input, {
      menuItemId,
      clearVariant: false,
      clearModifier: false,
    });

    return this.getMenuItemInventoryConfig(businessId, menuItemId);
  }

  async updateVariant(businessId: string, variantId: string, input: SellableInventoryInput) {
    const variant = await prisma.menuItemVariant.findFirst({
      where: { id: variantId, menuItem: { businessId } },
    });
    if (!variant) throw new MenuItemVariantNotFoundError();

    await this.validateAndApply(businessId, input, {
      menuItemVariantId: variantId,
      clearMenuItem: false,
      clearModifier: false,
    });

    return this.getVariantInventoryConfig(businessId, variantId);
  }

  async updateModifierOption(
    businessId: string,
    modifierOptionId: string,
    input: SellableInventoryInput,
  ) {
    const option = await prisma.modifierOption.findFirst({
      where: { id: modifierOptionId, modifierGroup: { businessId } },
    });
    if (!option) throw new ModifierOptionNotFoundError();

    await this.validateAndApply(businessId, input, {
      modifierOptionId,
      clearMenuItem: false,
      clearVariant: false,
    });

    return this.getModifierInventoryConfig(businessId, modifierOptionId);
  }

  private async validateAndApply(
    businessId: string,
    input: SellableInventoryInput,
    owner: {
      menuItemId?: string;
      menuItemVariantId?: string;
      modifierOptionId?: string;
      clearMenuItem?: boolean;
      clearVariant?: boolean;
      clearModifier?: boolean;
    },
  ) {
    if (input.trackingMode === 'SIMPLE_STOCK') {
      if (!input.inventoryItemId) {
        throw new InvalidInventoryConfigError('inventoryItemId is required for SIMPLE_STOCK tracking');
      }
      const inv = await prisma.inventoryItem.findFirst({
        where: { id: input.inventoryItemId, businessId },
      });
      if (!inv) throw new InventoryItemNotFoundError();
    }

    if (input.trackingMode === 'RECIPE') {
      if (!input.recipeLines?.length) {
        throw new InvalidInventoryConfigError('At least one recipe line is required for RECIPE tracking');
      }
      for (const line of input.recipeLines) {
        const inv = await prisma.inventoryItem.findFirst({
          where: { id: line.inventoryItemId, businessId },
        });
        if (!inv) throw new InventoryItemNotFoundError();
        if (!unitsCompatible(line.unit, inv.unit)) {
          throw new InvalidInventoryConfigError(
            `Unit ${line.unit} is not compatible with inventory item unit ${inv.unit}`,
          );
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      if (owner.menuItemId) {
        await tx.menuItem.update({
          where: { id: owner.menuItemId },
          data: {
            inventoryTrackingMode: input.trackingMode,
            inventoryItemId:
              input.trackingMode === 'SIMPLE_STOCK' ? input.inventoryItemId : null,
          },
        });
      }

      if (owner.menuItemVariantId) {
        await tx.menuItemVariant.update({
          where: { id: owner.menuItemVariantId },
          data: {
            inventoryTrackingMode: input.trackingMode,
            inventoryItemId:
              input.trackingMode === 'SIMPLE_STOCK' ? input.inventoryItemId : null,
          },
        });
      }

      if (owner.modifierOptionId) {
        await tx.modifierOption.update({
          where: { id: owner.modifierOptionId },
          data: {
            inventoryTrackingMode: input.trackingMode,
            inventoryItemId:
              input.trackingMode === 'SIMPLE_STOCK' ? input.inventoryItemId : null,
          },
        });
      }

      const recipeWhere =
        owner.menuItemId
          ? { menuItemId: owner.menuItemId }
          : owner.menuItemVariantId
            ? { menuItemVariantId: owner.menuItemVariantId }
            : { modifierOptionId: owner.modifierOptionId! };

      const existingRecipe = await tx.inventoryRecipe.findFirst({ where: recipeWhere });

      if (input.trackingMode === 'RECIPE' && input.recipeLines) {
        let recipeId = existingRecipe?.id;
        if (!recipeId) {
          const created = await tx.inventoryRecipe.create({
            data: {
              businessId,
              menuItemId: owner.menuItemId ?? null,
              menuItemVariantId: owner.menuItemVariantId ?? null,
              modifierOptionId: owner.modifierOptionId ?? null,
            },
          });
          recipeId = created.id;
        } else {
          await tx.inventoryRecipeLine.deleteMany({ where: { recipeId } });
        }

        await tx.inventoryRecipeLine.createMany({
          data: input.recipeLines.map((line) => ({
            recipeId: recipeId!,
            inventoryItemId: line.inventoryItemId,
            quantity: line.quantity,
            unit: line.unit,
          })),
        });
      } else if (existingRecipe) {
        await tx.inventoryRecipeLine.deleteMany({ where: { recipeId: existingRecipe.id } });
        await tx.inventoryRecipe.delete({ where: { id: existingRecipe.id } });
      }
    });
  }

  async getMenuItemInventoryConfig(businessId: string, menuItemId: string) {
    const item = await prisma.menuItem.findFirst({
      where: { id: menuItemId, businessId },
      include: {
        inventoryRecipe: { include: { lines: true } },
      },
    });
    if (!item) throw new MenuItemNotFoundError();
    return this.mapConfig(item.inventoryTrackingMode, item.inventoryItemId, item.inventoryRecipe);
  }

  async getVariantInventoryConfig(businessId: string, variantId: string) {
    const variant = await prisma.menuItemVariant.findFirst({
      where: { id: variantId, menuItem: { businessId } },
      include: { inventoryRecipe: { include: { lines: true } } },
    });
    if (!variant) throw new MenuItemVariantNotFoundError();
    return this.mapConfig(
      variant.inventoryTrackingMode,
      variant.inventoryItemId,
      variant.inventoryRecipe,
    );
  }

  async getModifierInventoryConfig(businessId: string, modifierOptionId: string) {
    const option = await prisma.modifierOption.findFirst({
      where: { id: modifierOptionId, modifierGroup: { businessId } },
      include: { inventoryRecipe: { include: { lines: true } } },
    });
    if (!option) throw new ModifierOptionNotFoundError();
    return this.mapConfig(
      option.inventoryTrackingMode,
      option.inventoryItemId,
      option.inventoryRecipe,
    );
  }

  private mapConfig(
    trackingMode: InventoryTrackingMode,
    inventoryItemId: string | null,
    recipe: {
      lines: Array<{
        inventoryItemId: string;
        quantity: { toString(): string };
        unit: InventoryUnit;
      }>;
    } | null,
  ) {
    return {
      trackingMode,
      inventoryItemId,
      recipeLines:
        recipe?.lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          quantity: l.quantity.toString(),
          unit: l.unit,
        })) ?? [],
    };
  }
}
