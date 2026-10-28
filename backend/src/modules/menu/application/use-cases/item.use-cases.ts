import { MenuRepository } from '../../domain/repositories/menu.repository';
import {
  CategoryNotFoundError,
  MenuItemNotFoundError,
  SellByWeightConflictError,
} from '../../domain/errors/menu.errors';
import { resolveMenuItemPriceFields, type MenuWeightConfigInput } from '../menu-weight-config';
import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

type ItemWriteInput = MenuWeightConfigInput & {
  categoryId?: string;
  name?: string;
  description?: string | null;
  basePrice?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
  displayOrder?: number;
};

function wantsPricingFieldUpdate(input: ItemWriteInput): boolean {
  return (
    input.pricingType !== undefined ||
    input.price !== undefined ||
    input.pricePerUnit !== undefined ||
    input.pricingUnitG !== undefined ||
    input.minWeightG !== undefined ||
    input.weightStepG !== undefined ||
    input.quickWeightsG !== undefined ||
    input.priceRounding !== undefined
  );
}

function mapPricingFields(input: ItemWriteInput) {
  try {
    return resolveMenuItemPriceFields({
      pricingType: input.pricingType ?? 'fixed',
      price: input.price,
      pricePerUnit: input.pricePerUnit,
      pricingUnitG: input.pricingUnitG,
      minWeightG: input.minWeightG,
      weightStepG: input.weightStepG,
      quickWeightsG: input.quickWeightsG ?? undefined,
      priceRounding: input.priceRounding,
    });
  } catch (error) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      error instanceof Error ? error.message : 'Invalid weight pricing',
      400,
    );
  }
}

export class CreateMenuItemUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
    businessId: string,
    input: ItemWriteInput & {
      categoryId: string;
      name: string;
      description?: string;
      basePrice?: string;
      imageUrl?: string;
      displayOrder?: number;
    },
  ) {
    const category = await this.menuRepository.findCategory(businessId, input.categoryId);
    if (!category) throw new CategoryNotFoundError();
    const pricing = mapPricingFields(input);
    return this.menuRepository.createItem(businessId, {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      basePrice: input.basePrice,
      imageUrl: input.imageUrl,
      displayOrder: input.displayOrder,
      price: pricing.price,
      pricingType: pricing.pricingType,
      pricePerKg: pricing.pricePerKg,
      pricingUnitG: pricing.pricingUnitG,
      minWeightG: pricing.minWeightG,
      weightStepG: pricing.weightStepG,
      quickWeightsG: pricing.quickWeightsG,
      priceRounding: pricing.priceRounding,
    });
  }
}

export class UpdateMenuItemUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, itemId: string, input: ItemWriteInput) {
    if (input.categoryId) {
      const category = await this.menuRepository.findCategory(businessId, input.categoryId);
      if (!category) throw new CategoryNotFoundError();
    }

    const variantCount = await this.menuRepository.countVariants(businessId, itemId);
    const nextPricingType = input.pricingType ?? undefined;
    if (nextPricingType === 'by_weight' && variantCount > 0) {
      throw new SellByWeightConflictError(
        'Remove all variants before switching this item to sell by weight',
      );
    }

    let pricingFields: ReturnType<typeof mapPricingFields> | undefined;
    if (wantsPricingFieldUpdate(input)) {
      const existingItem = await this.menuRepository.findItemById(businessId, itemId);
      if (!existingItem) throw new MenuItemNotFoundError();

      const pricingType =
        input.pricingType ??
        (existingItem.pricingType === 'BY_WEIGHT' ? 'by_weight' : 'fixed');

      let price = input.price;
      if (price == null && variantCount > 0 && pricingType === 'fixed') {
        price = existingItem.price;
      }

      pricingFields = mapPricingFields({
        pricingType,
        price,
        pricePerUnit: input.pricePerUnit,
        pricingUnitG: input.pricingUnitG,
        minWeightG: input.minWeightG,
        weightStepG: input.weightStepG,
        quickWeightsG: input.quickWeightsG ?? undefined,
        priceRounding: input.priceRounding,
      });
    }

    try {
      return await this.menuRepository.updateItem(businessId, itemId, {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        basePrice: input.basePrice,
        imageUrl: input.imageUrl,
        isAvailable: input.isAvailable,
        displayOrder: input.displayOrder,
        ...(pricingFields
          ? {
              price: pricingFields.price,
              pricingType: pricingFields.pricingType,
              pricePerKg: pricingFields.pricePerKg,
              pricingUnitG: pricingFields.pricingUnitG,
              minWeightG: pricingFields.minWeightG,
              weightStepG: pricingFields.weightStepG,
              quickWeightsG: pricingFields.quickWeightsG,
              priceRounding: pricingFields.priceRounding,
            }
          : {}),
      });
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
