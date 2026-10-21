import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class RiderCashSettlementNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.NOT_FOUND, 'Rider cash handoff not found', 404);
  }
}

export class RiderCashSettlementAlreadyConfirmedError extends AppError {
  constructor() {
    super(ErrorCodes.CONFLICT, 'Rider cash handoff was already confirmed', 409);
  }
}
