import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class InventoryItemNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.INVENTORY_ITEM_NOT_FOUND, 'Inventory item not found', 404);
  }
}

export class InventoryItemNameConflictError extends AppError {
  constructor() {
    super(ErrorCodes.INVENTORY_ITEM_NAME_CONFLICT, 'An inventory item with this name already exists', 409);
  }
}

export class InsufficientInventoryError extends AppError {
  constructor(
    message = 'Insufficient inventory to complete this order',
    details?: { inventoryItemId: string; name: string; required: string; available: string }[],
  ) {
    super(ErrorCodes.INSUFFICIENT_INVENTORY, message, 400, details);
  }
}

export class InvalidInventoryConfigError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.INVALID_INVENTORY_CONFIG, message, 400);
  }
}
