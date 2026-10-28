import { MenuRepository } from '../../domain/repositories/menu.repository';
import {
  MenuItemNotFoundError,
  MenuItemVariantNotFoundError,
  SellByWeightConflictError,
} from '../../domain/errors/menu.errors';

export class ListModifierGroupsUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  execute(businessId: string) {
    return this.menuRepository.listModifierGroups(businessId);
  }
}

export class CreateMenuItemVariantUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
    businessId: string,
    itemId: string,
    input: { name: string; price: string; basePrice?: string; displayOrder?: number },
  ) {
    try {
      const blocked = await this.menuRepository.isSellByWeightItem(businessId, itemId);
      if (blocked) {
        throw new SellByWeightConflictError('Variants are not available on sell-by-weight items');
      }
      return await this.menuRepository.createVariant(businessId, itemId, input);
    } catch (error) {
      if (error instanceof SellByWeightConflictError) throw error;
      throw new MenuItemNotFoundError();
    }
  }
}

export class UpdateMenuItemVariantUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
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
    try {
      return await this.menuRepository.updateVariant(businessId, variantId, input);
    } catch {
      throw new MenuItemVariantNotFoundError();
    }
  }
}

export class DeleteMenuItemVariantUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, variantId: string) {
    try {
      await this.menuRepository.deleteVariant(businessId, variantId);
    } catch {
      throw new MenuItemVariantNotFoundError();
    }
  }
}
