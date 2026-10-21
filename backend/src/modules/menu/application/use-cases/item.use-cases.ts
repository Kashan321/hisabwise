import { MenuRepository } from '../../domain/repositories/menu.repository';
import { CategoryNotFoundError, MenuItemNotFoundError } from '../../domain/errors/menu.errors';

export class CreateMenuItemUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
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
  ) {
    const category = await this.menuRepository.findCategory(businessId, input.categoryId);
    if (!category) throw new CategoryNotFoundError();
    return this.menuRepository.createItem(businessId, input);
  }
}

export class UpdateMenuItemUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
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
  ) {
    if (input.categoryId) {
      const category = await this.menuRepository.findCategory(businessId, input.categoryId);
      if (!category) throw new CategoryNotFoundError();
    }

    try {
      return await this.menuRepository.updateItem(businessId, itemId, input);
    } catch {
      throw new MenuItemNotFoundError();
    }
  }
}

export class DeleteMenuItemUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, itemId: string) {
    try {
      await this.menuRepository.deleteItem(businessId, itemId);
    } catch {
      throw new MenuItemNotFoundError();
    }
  }
}
