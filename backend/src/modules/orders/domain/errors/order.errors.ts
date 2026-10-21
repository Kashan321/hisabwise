import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class OrderNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.ORDER_NOT_FOUND, 'Order not found', 404);
  }
}

export class MenuItemUnavailableError extends AppError {
  constructor(name?: string) {
    super(
      ErrorCodes.MENU_ITEM_UNAVAILABLE,
      name ? `Menu item "${name}" is unavailable` : 'Menu item is unavailable',
      400,
    );
  }
}

export class InvalidOrderItemError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.INVALID_ORDER_ITEM, message, 400);
  }
}

export class InvalidOrderStatusError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.INVALID_ORDER_STATUS, message, 400);
  }
}

export class TableNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.TABLE_NOT_FOUND, 'Table not found', 404);
  }
}

export class PromotionNotApplicableError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.PROMOTION_NOT_APPLICABLE, message, 400);
  }
}

export class InvalidDeliveryStatusError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.INVALID_DELIVERY_STATUS, message, 400);
  }
}

export class ChangeRequestNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.CHANGE_REQUEST_NOT_FOUND, 'Change request not found', 404);
  }
}

export class InvalidChangeRequestError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.INVALID_CHANGE_REQUEST, message, 400);
  }
}

export class StaffNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.STAFF_NOT_FOUND, 'Staff member not found', 404);
  }
}

export class OrderAlreadySentError extends AppError {
  constructor() {
    super(ErrorCodes.ORDER_ALREADY_SENT, 'Order has already been sent to the kitchen', 400);
  }
}

export class InvalidPaymentError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400);
  }
}

export class OrderIsDraftError extends AppError {
  constructor() {
    super(ErrorCodes.ORDER_IS_DRAFT, 'Order is still a draft', 400);
  }
}

export class OrderNotModifiableError extends AppError {
  constructor(message = 'Items cannot be added to this order') {
    super(ErrorCodes.ORDER_NOT_MODIFIABLE, message, 400);
  }
}
