import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class TableNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.TABLE_NOT_FOUND, 'Table not found', 404);
  }
}

export class DuplicateTableIdentifierError extends AppError {
  constructor() {
    super(ErrorCodes.DUPLICATE_TABLE_IDENTIFIER, 'Table identifier already exists', 409);
  }
}

export class InvalidTableStatusError extends AppError {
  constructor() {
    super(ErrorCodes.VALIDATION_ERROR, 'Invalid table status', 400);
  }
}

export class TableHasOpenBillError extends AppError {
  constructor() {
    super(
      ErrorCodes.INVALID_ORDER_STATUS,
      'This table still has an unpaid bill. Take payment first.',
      409,
    );
  }
}

export class FloorPlanNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.NOT_FOUND, 'Floor plan not found', 404);
  }
}

export class FloorElementNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.NOT_FOUND, 'Floor element not found', 404);
  }
}
