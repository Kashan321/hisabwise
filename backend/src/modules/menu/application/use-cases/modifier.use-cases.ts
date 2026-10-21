import { MenuRepository } from '../../domain/repositories/menu.repository';
import {
  MenuItemNotFoundError,
  ModifierGroupNotFoundError,
  ModifierOptionNotFoundError,
} from '../../domain/errors/menu.errors';

export class CreateModifierGroupUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  execute(
    businessId: string,
    input: { name: string; isRequired?: boolean; minSelect?: number; maxSelect?: number },
  ) {
    return this.menuRepository.createModifierGroup(businessId, input);
  }
}

export class UpdateModifierGroupUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
    businessId: string,
    groupId: string,
    input: { name?: string; isRequired?: boolean; minSelect?: number; maxSelect?: number },
  ) {
    try {
      return await this.menuRepository.updateModifierGroup(businessId, groupId, input);
    } catch {
      throw new ModifierGroupNotFoundError();
    }
  }
}

export class DeleteModifierGroupUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, groupId: string) {
    try {
      await this.menuRepository.deleteModifierGroup(businessId, groupId);
    } catch {
      throw new ModifierGroupNotFoundError();
    }
  }
}

export class CreateModifierOptionUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
    businessId: string,
    groupId: string,
    input: { name: string; priceAdjustment?: string; displayOrder?: number },
  ) {
    try {
      return await this.menuRepository.createModifierOption(businessId, groupId, input);
    } catch {
      throw new ModifierGroupNotFoundError();
    }
  }
}

export class UpdateModifierOptionUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(
    businessId: string,
    optionId: string,
    input: {
      name?: string;
      priceAdjustment?: string;
      isAvailable?: boolean;
      displayOrder?: number;
    },
  ) {
    try {
      return await this.menuRepository.updateModifierOption(businessId, optionId, input);
    } catch {
      throw new ModifierOptionNotFoundError();
    }
  }
}

export class DeleteModifierOptionUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, optionId: string) {
    try {
      await this.menuRepository.deleteModifierOption(businessId, optionId);
    } catch {
      throw new ModifierOptionNotFoundError();
    }
  }
}

export class LinkModifierGroupUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, itemId: string, groupId: string) {
    try {
      await this.menuRepository.linkModifierGroup(businessId, itemId, groupId);
    } catch {
      throw new MenuItemNotFoundError();
    }
  }
}

export class UnlinkModifierGroupUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  async execute(businessId: string, itemId: string, groupId: string) {
    await this.menuRepository.unlinkModifierGroup(businessId, itemId, groupId);
  }
}
