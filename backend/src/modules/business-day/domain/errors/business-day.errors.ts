import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class BusinessDayAlreadyOpenError extends AppError {
  constructor() {
    super(ErrorCodes.CONFLICT, 'A business day is already open', 409);
  }
}

export class BusinessDayNotOpenError extends AppError {
  constructor() {
    super(ErrorCodes.VALIDATION_ERROR, 'No business day is currently open', 400);
  }
}

export class BusinessDayNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.NOT_FOUND, 'Business day not found', 404);
  }
}

export class BusinessDayHasOpenShiftsError extends AppError {
  constructor() {
    super(ErrorCodes.CONFLICT, 'Close all cash shifts before closing the business day', 409);
  }
}

export class BusinessDayAlreadyClosedError extends AppError {
  constructor() {
    super(ErrorCodes.VALIDATION_ERROR, 'Business day is already closed', 400);
  }
}
