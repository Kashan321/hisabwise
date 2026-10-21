export interface ModifierOptionEntity {
  id: string;
  name: string;
  priceAdjustment: string;
  isAvailable: boolean;
  displayOrder: number;
}

export interface MenuItemVariantEntity {
  id: string;
  name: string;
  price: string;
  basePrice: string | null;
  isAvailable: boolean;
  displayOrder: number;
}

export interface ModifierGroupEntity {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOptionEntity[];
}

export interface MenuItemEntity {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  basePrice: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  displayOrder: number;
  modifierGroups: ModifierGroupEntity[];
  variants: MenuItemVariantEntity[];
}

export interface MenuCategoryEntity {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItemEntity[];
}

export interface MenuRepository {
  getFullMenu(businessId: string): Promise<MenuCategoryEntity[]>;
  findCategory(businessId: string, categoryId: string): Promise<{ id: string } | null>;

  createCategory(
    businessId: string,
    input: { name: string; displayOrder?: number },
  ): Promise<{ id: string; name: string; displayOrder: number; isActive: boolean }>;
  updateCategory(
    businessId: string,
    categoryId: string,
    input: { name?: string; displayOrder?: number; isActive?: boolean },
  ): Promise<{ id: string; name: string; displayOrder: number; isActive: boolean }>;
  deleteCategory(businessId: string, categoryId: string): Promise<void>;

  createItem(
    businessId: string,
    input: {
      categoryId: string;
      name: string;
      description?: string;
      price: string;
      basePrice?: string;
      imageUrl?: string;
      displayOrder?: number;
    },
  ): Promise<MenuItemEntity>;
  updateItem(
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
    },
  ): Promise<MenuItemEntity>;
  deleteItem(businessId: string, itemId: string): Promise<void>;

  createModifierGroup(
    businessId: string,
    input: { name: string; isRequired?: boolean; minSelect?: number; maxSelect?: number },
  ): Promise<ModifierGroupEntity>;
  updateModifierGroup(
    businessId: string,
    groupId: string,
    input: { name?: string; isRequired?: boolean; minSelect?: number; maxSelect?: number },
  ): Promise<ModifierGroupEntity>;
  deleteModifierGroup(businessId: string, groupId: string): Promise<void>;

  createModifierOption(
    businessId: string,
    groupId: string,
    input: { name: string; priceAdjustment?: string; displayOrder?: number },
  ): Promise<ModifierOptionEntity>;
  updateModifierOption(
    businessId: string,
    optionId: string,
    input: {
      name?: string;
      priceAdjustment?: string;
      isAvailable?: boolean;
      displayOrder?: number;
    },
  ): Promise<ModifierOptionEntity>;
  deleteModifierOption(businessId: string, optionId: string): Promise<void>;

  linkModifierGroup(businessId: string, itemId: string, groupId: string): Promise<void>;
  unlinkModifierGroup(businessId: string, itemId: string, groupId: string): Promise<void>;

  listModifierGroups(businessId: string): Promise<ModifierGroupEntity[]>;

  createVariant(
    businessId: string,
    itemId: string,
    input: { name: string; price: string; basePrice?: string; displayOrder?: number },
  ): Promise<MenuItemVariantEntity>;
  updateVariant(
    businessId: string,
    variantId: string,
    input: {
      name?: string;
      price?: string;
      basePrice?: string | null;
      isAvailable?: boolean;
      displayOrder?: number;
    },
  ): Promise<MenuItemVariantEntity>;
  deleteVariant(businessId: string, variantId: string): Promise<void>;
}
