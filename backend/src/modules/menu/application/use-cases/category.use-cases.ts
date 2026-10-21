import { MenuRepository } from '../../domain/repositories/menu.repository';
import { CategoryNotFoundError, DuplicateCategoryError } from '../../domain/errors/menu.errors';

export class CreateCategoryUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, input: { name: string; displayOrder?: number }) {
    try {
      return await this.menuRepository.createCategory(businessId, input);
    } catch (error) {
      if (this.isUniqueError(error)) throw new DuplicateCategoryError();
      throw error;
    }
  }

  private isUniqueError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}

export class UpdateCategoryUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
    businessId: string,
    categoryId: string,
    input: { name?: string; displayOrder?: number; isActive?: boolean },
  ) {
    const existing = await this.menuRepository.findCategory(businessId, categoryId);
    if (!existing) throw new CategoryNotFoundError();

    try {
      return await this.menuRepository.updateCategory(businessId, categoryId, input);
    } catch (error) {
      if (this.isUniqueError(error)) throw new DuplicateCategoryError();
      throw error;
    }
  }

  private isUniqueError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}

export class DeleteCategoryUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, categoryId: string) {
    const existing = await this.menuRepository.findCategory(businessId, categoryId);
    if (!existing) throw new CategoryNotFoundError();
    await this.menuRepository.deleteCategory(businessId, categoryId);
  }
}
