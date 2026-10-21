import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class CategoryNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.CATEGORY_NOT_FOUND, 'Menu category not found', 404);
  }
}

export class MenuItemNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.MENU_ITEM_NOT_FOUND, 'Menu item not found', 404);
  }
}

export class ModifierGroupNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.MODIFIER_GROUP_NOT_FOUND, 'Modifier group not found', 404);
  }
}

export class ModifierOptionNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.MODIFIER_OPTION_NOT_FOUND, 'Modifier option not found', 404);
  }
}

export class MenuItemVariantNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.MENU_ITEM_VARIANT_NOT_FOUND, 'Menu item variant not found', 404);
  }
}

export class DuplicateCategoryError extends AppError {
  constructor() {
    super(ErrorCodes.CONFLICT, 'Category name already exists', 409);
  }
}

export class MenuCsvImportError extends AppError {
  constructor(errors: Array<{ lineNumber: number; message: string }>) {
    super(ErrorCodes.MENU_CSV_IMPORT_ERROR, 'Menu CSV import failed', 400, { errors });
  }
}
