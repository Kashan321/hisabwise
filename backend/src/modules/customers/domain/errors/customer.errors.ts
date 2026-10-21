import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class CustomerNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.CUSTOMER_NOT_FOUND, 'Customer not found', 404);
  }
}

export class DuplicateCustomerError extends AppError {
  constructor() {
    super(ErrorCodes.DUPLICATE_CUSTOMER, 'Customer with this email or phone already exists', 409);
  }
}

export class InsufficientLoyaltyPointsError extends AppError {
  constructor() {
    super(ErrorCodes.INSUFFICIENT_LOYALTY_POINTS, 'Insufficient loyalty points', 400);
  }
}
