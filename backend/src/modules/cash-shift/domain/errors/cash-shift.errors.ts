import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class CashShiftNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.NOT_FOUND, 'Cash shift not found', 404);
  }
}

export class CashShiftAlreadyOpenError extends AppError {
  constructor() {
    super(ErrorCodes.CONFLICT, 'A cash shift is already open', 409);
  }
}

export class CashShiftNotOpenError extends AppError {
  constructor() {
    super(ErrorCodes.VALIDATION_ERROR, 'No open cash shift', 400);
  }
}

export class CashShiftClosedError extends AppError {
  constructor() {
    super(ErrorCodes.VALIDATION_ERROR, 'Cash shift is already closed', 400);
  }
}
