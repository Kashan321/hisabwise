import { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import { filesModule } from '../../../files/infrastructure/files.module';
import {
  MenuCategoryEntity,
  MenuItemEntity,
  MenuItemVariantEntity,
  MenuRepository,
  ModifierGroupEntity,
  ModifierOptionEntity,
} from '../../domain/repositories/menu.repository';
import {
  CategoryNotFoundError,
  MenuItemNotFoundError,
  MenuItemVariantNotFoundError,
  ModifierGroupNotFoundError,
  ModifierOptionNotFoundError,
  SellByWeightConflictError,
} from '../../domain/errors/menu.errors';

function decimalToString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function mapOption(option: {
  id: string;
  name: string;
  priceAdjustment: Prisma.Decimal;
  isAvailable: boolean;
  displayOrder: number;
}): ModifierOptionEntity {
  return {
    id: option.id,
    name: option.name,
    priceAdjustment: decimalToString(option.priceAdjustment),
    isAvailable: option.isAvailable,
    displayOrder: option.displayOrder,
  };
}

function mapVariant(variant: {
  id: string;
  name: string;
  price: Prisma.Decimal;
  basePrice: Prisma.Decimal | null;
  isAvailable: boolean;
  displayOrder: number;
}): MenuItemVariantEntity {
  return {
    id: variant.id,
    name: variant.name,
    price: decimalToString(variant.price),
    basePrice: variant.basePrice != null ? decimalToString(variant.basePrice) : null,
    isAvailable: variant.isAvailable,
    displayOrder: variant.displayOrder,
  };
}

function mapModifierGroup(group: {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: Array<{
    id: string;
    name: string;
    priceAdjustment: Prisma.Decimal;
    isAvailable: boolean;
    displayOrder: number;
  }>;
}): ModifierGroupEntity {
  return {
    id: group.id,
    name: group.name,
    isRequired: group.isRequired,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    options: group.options.map(mapOption),
  };
}

function parseQuickWeights(value: Prisma.JsonValue | null): number[] | null {
  if (!value || !Array.isArray(value)) return null;
  const nums = value.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return nums.length ? nums : null;
}

function mapItem(item: {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  basePrice: Prisma.Decimal | null;
  imageUrl: string | null;
  isAvailable: boolean;
  displayOrder: number;
  pricingType: 'FIXED' | 'BY_WEIGHT';
  pricePerKg: Prisma.Decimal | null;
  pricingUnitG: number | null;
  minWeightG: number | null;
  weightStepG: number | null;
  quickWeightsG: Prisma.JsonValue | null;
  priceRounding: number | null;
  modifierGroups: Array<{
    modifierGroup: {
      id: string;
      name: string;
      isRequired: boolean;
      minSelect: number;
      maxSelect: number;
      options: Array<{
        id: string;
        name: string;
        priceAdjustment: Prisma.Decimal;
        isAvailable: boolean;
        displayOrder: number;
      }>;
    };
  }>;
  variants: Array<{
    id: string;
    name: string;
    price: Prisma.Decimal;
    basePrice: Prisma.Decimal | null;
    isAvailable: boolean;
    displayOrder: number;
  }>;
}): MenuItemEntity {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    price: decimalToString(item.price),
    basePrice: item.basePrice != null ? decimalToString(item.basePrice) : null,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    displayOrder: item.displayOrder,
    pricingType: item.pricingType,
    pricePerKg: item.pricePerKg != null ? decimalToString(item.pricePerKg) : null,
    pricingUnitG: item.pricingUnitG,
    minWeightG: item.minWeightG,
    weightStepG: item.weightStepG,
    quickWeightsG: parseQuickWeights(item.quickWeightsG),
    priceRounding: item.priceRounding,
    modifierGroups: item.modifierGroups
      .filter((link) => link.modifierGroup)
      .map((link) => mapModifierGroup(link.modifierGroup)),
    variants: item.variants.map(mapVariant),
  };
}

const itemInclude = {
  modifierGroups: {
    include: {
      modifierGroup: {
        include: {
          options: { orderBy: { displayOrder: 'asc' as const } },
        },
      },
    },
  },
  variants: { orderBy: { displayOrder: 'asc' as const } },
} as const;

const storageUrlResolver = filesModule.storageUrlResolver;

function normalizeImageUrl(imageUrl: string | null | undefined): string | null | undefined {
  if (imageUrl === undefined) return undefined;
  if (!imageUrl) return imageUrl;
  return storageUrlResolver.normalizeKey(imageUrl);
}

export class PrismaMenuRepository implements MenuRepository {
  async getFullMenu(businessId: string): Promise<MenuCategoryEntity[]> {
    const categories = await prisma.menuCategory.findMany({
      where: { businessId },
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: itemInclude,
        },
      },
    });

    return storageUrlResolver.resolveMenuCategories(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        items: category.items.map(mapItem),
      })),
    );
  }

  async findCategory(businessId: string, categoryId: string) {
    return prisma.menuCategory.findFirst({
      where: { id: categoryId, businessId },
      select: { id: true },
    });
  }

  async createCategory(
    businessId: string,
    input: { name: string; displayOrder?: number },
  ) {
    return prisma.menuCategory.create({
      data: {
        businessId,
        name: input.name,
        displayOrder: input.displayOrder ?? 0,
      },
      select: { id: true, name: true, displayOrder: true, isActive: true },
    });
  }

  async updateCategory(
    businessId: string,
    categoryId: string,
    input: { name?: string; displayOrder?: number; isActive?: boolean },
  ) {
    try {
      const existing = await prisma.menuCategory.findFirst({
        where: { id: categoryId, businessId },
      });
      if (!existing) throw new CategoryNotFoundError();

      return await prisma.menuCategory.update({
        where: { id: categoryId },
        data: input,
        select: { id: true, name: true, displayOrder: true, isActive: true },
      });
    } catch (error) {
      if (error instanceof CategoryNotFoundError) throw error;
      throw new CategoryNotFoundError();
    }
  }

  async deleteCategory(businessId: string, categoryId: string) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, businessId },
      select: { id: true },
    });
    if (!category) throw new CategoryNotFoundError();

    await prisma.menuCategory.delete({ where: { id: categoryId } });
  }

  async createItem(
    businessId: string,
    input: {
      categoryId: string;
      name: string;
      description?: string;
      price: string;
      basePrice?: string;
      imageUrl?: string;
      displayOrder?: number;
      pricingType?: 'FIXED' | 'BY_WEIGHT';
      pricePerKg?: string | null;
      pricingUnitG?: number | null;
      minWeightG?: number | null;
      weightStepG?: number | null;
      quickWeightsG?: number[] | null;
      priceRounding?: number | null;
    },
  ) {
    const item = await prisma.menuItem.create({
      data: {
        businessId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        price: input.price,
        basePrice: input.basePrice ?? null,
        imageUrl: normalizeImageUrl(input.imageUrl),
        displayOrder: input.displayOrder ?? 0,
        pricingType: input.pricingType ?? 'FIXED',
        pricePerKg: input.pricePerKg ?? null,
        pricingUnitG: input.pricingUnitG ?? null,
        minWeightG: input.minWeightG ?? null,
        weightStepG: input.weightStepG ?? null,
        quickWeightsG: input.quickWeightsG ?? undefined,
        priceRounding: input.priceRounding ?? null,
      },
      include: itemInclude,
    });
    return storageUrlResolver.resolveMenuItem(mapItem(item));
  }

  async updateItem(
    businessId: string,
    itemId: string,
    input: {
      categoryId?: string;
      name?: string;
      description?: string | null;
      price?: string;
      basePrice?: string | null;
      imageUrl?: string | null;
      isAvailable?: boolean;
      displayOrder?: number;
      pricingType?: 'FIXED' | 'BY_WEIGHT';
      pricePerKg?: string | null;
      pricingUnitG?: number | null;
      minWeightG?: number | null;
      weightStepG?: number | null;
      quickWeightsG?: number[] | null;
      priceRounding?: number | null;
    },
  ) {
    const existing = await prisma.menuItem.findFirst({ where: { id: itemId, businessId } });
    if (!existing) throw new MenuItemNotFoundError();

    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        price: input.price !== undefined ? input.price : undefined,
        basePrice: input.basePrice !== undefined ? input.basePrice : undefined,
        imageUrl: normalizeImageUrl(input.imageUrl),
        isAvailable: input.isAvailable,
        displayOrder: input.displayOrder,
        pricingType: input.pricingType,
        pricePerKg: input.pricePerKg,
        pricingUnitG: input.pricingUnitG,
        minWeightG: input.minWeightG,
        weightStepG: input.weightStepG,
        quickWeightsG: input.quickWeightsG ?? undefined,
        priceRounding: input.priceRounding,
      },
      include: itemInclude,
    });
    return storageUrlResolver.resolveMenuItem(mapItem(item));
  }

  async countVariants(businessId: string, itemId: string): Promise<number> {
    return prisma.menuItemVariant.count({
      where: { menuItemId: itemId, menuItem: { businessId } },
    });
  }

  async findItemById(
    businessId: string,
    itemId: string,
  ): Promise<{ price: string; pricingType: 'FIXED' | 'BY_WEIGHT' } | null> {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, businessId },
      select: { price: true, pricingType: true },
    });
    if (!item) return null;
    return {
      price: item.price.toString(),
      pricingType: item.pricingType,
    };
  }

  async isSellByWeightItem(businessId: string, itemId: string): Promise<boolean> {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, businessId },
      select: { pricingType: true },
    });
    return item?.pricingType === 'BY_WEIGHT';
  }

  async deleteItem(businessId: string, itemId: string) {
    const result = await prisma.menuItem.deleteMany({ where: { id: itemId, businessId } });
    if (result.count === 0) throw new MenuItemNotFoundError();
  }

  async createModifierGroup(
    businessId: string,
    input: { name: string; isRequired?: boolean; minSelect?: number; maxSelect?: number },
  ) {
    const group = await prisma.modifierGroup.create({
      data: {
        businessId,
        name: input.name,
        isRequired: input.isRequired ?? false,
        minSelect: input.minSelect ?? 0,
        maxSelect: input.maxSelect ?? 1,
      },
      include: { options: true },
    });
    return mapModifierGroup(group);
  }

  async updateModifierGroup(
    businessId: string,
    groupId: string,
    input: { name?: string; isRequired?: boolean; minSelect?: number; maxSelect?: number },
  ) {
    const existing = await prisma.modifierGroup.findFirst({
      where: { id: groupId, businessId },
    });
    if (!existing) throw new ModifierGroupNotFoundError();

    const group = await prisma.modifierGroup.update({
      where: { id: groupId },
      data: input,
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });
    return mapModifierGroup(group);
  }

  async deleteModifierGroup(businessId: string, groupId: string) {
    const result = await prisma.modifierGroup.deleteMany({
      where: { id: groupId, businessId },
    });
    if (result.count === 0) throw new ModifierGroupNotFoundError();
  }

  async createModifierOption(
    businessId: string,
    groupId: string,
    input: { name: string; priceAdjustment?: string; displayOrder?: number },
  ) {
    const group = await prisma.modifierGroup.findFirst({
      where: { id: groupId, businessId },
    });
    if (!group) throw new ModifierGroupNotFoundError();

    const option = await prisma.modifierOption.create({
      data: {
        modifierGroupId: groupId,
        name: input.name,
        priceAdjustment: input.priceAdjustment ?? '0',
        displayOrder: input.displayOrder ?? 0,
      },
    });
    return mapOption(option);
  }

  async updateModifierOption(
    businessId: string,
    optionId: string,
    input: {
      name?: string;
      priceAdjustment?: string;
      isAvailable?: boolean;
      displayOrder?: number;
    },
  ) {
    const option = await prisma.modifierOption.findFirst({
      where: { id: optionId, modifierGroup: { businessId } },
    });
    if (!option) throw new ModifierOptionNotFoundError();

    const updated = await prisma.modifierOption.update({
      where: { id: optionId },
      data: {
        ...input,
        priceAdjustment: input.priceAdjustment !== undefined ? input.priceAdjustment : undefined,
      },
    });
    return mapOption(updated);
  }

  async deleteModifierOption(businessId: string, optionId: string) {
    const option = await prisma.modifierOption.findFirst({
      where: { id: optionId, modifierGroup: { businessId } },
    });
    if (!option) throw new ModifierOptionNotFoundError();
    await prisma.modifierOption.delete({ where: { id: optionId } });
  }

  async linkModifierGroup(businessId: string, itemId: string, groupId: string) {
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, businessId } });
    if (!item) throw new MenuItemNotFoundError();

    const group = await prisma.modifierGroup.findFirst({ where: { id: groupId, businessId } });
    if (!group) throw new ModifierGroupNotFoundError();

    await prisma.menuItemModifierGroup.upsert({
      where: {
        menuItemId_modifierGroupId: { menuItemId: itemId, modifierGroupId: groupId },
      },
      update: {},
      create: { menuItemId: itemId, modifierGroupId: groupId },
    });
  }

  async unlinkModifierGroup(businessId: string, itemId: string, groupId: string) {
    await prisma.menuItemModifierGroup.deleteMany({
      where: {
        menuItemId: itemId,
        modifierGroupId: groupId,
        menuItem: { businessId },
      },
    });
  }

  async listModifierGroups(businessId: string): Promise<ModifierGroupEntity[]> {
    const groups = await prisma.modifierGroup.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      include: {
        options: { orderBy: { displayOrder: 'asc' } },
      },
    });
    return groups.map(mapModifierGroup);
  }

  async createVariant(
    businessId: string,
    itemId: string,
    input: { name: string; price: string; basePrice?: string; displayOrder?: number },
  ) {
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, businessId } });
    if (!item) throw new MenuItemNotFoundError();
    if (item.pricingType === 'BY_WEIGHT') {
      throw new SellByWeightConflictError('Variants are not available on sell-by-weight items');
    }

    const variant = await prisma.menuItemVariant.create({
      data: {
        menuItemId: itemId,
        name: input.name,
        price: input.price,
        basePrice: input.basePrice ?? null,
        displayOrder: input.displayOrder ?? 0,
      },
    });
    return mapVariant(variant);
  }

  async updateVariant(
    businessId: string,
    variantId: string,
    input: {
      name?: string;
      price?: string;
      basePrice?: string | null;
      isAvailable?: boolean;
      displayOrder?: number;
    },
  ) {
    const existing = await prisma.menuItemVariant.findFirst({
      where: { id: variantId, menuItem: { businessId } },
    });
    if (!existing) throw new MenuItemVariantNotFoundError();

    const variant = await prisma.menuItemVariant.update({
      where: { id: variantId },
      data: {
        ...input,
        price: input.price !== undefined ? input.price : undefined,
        basePrice: input.basePrice !== undefined ? input.basePrice : undefined,
      },
    });
    return mapVariant(variant);
  }

  async deleteVariant(businessId: string, variantId: string) {
    const existing = await prisma.menuItemVariant.findFirst({
      where: { id: variantId, menuItem: { businessId } },
    });
    if (!existing) throw new MenuItemVariantNotFoundError();
    await prisma.menuItemVariant.delete({ where: { id: variantId } });
  }
}
