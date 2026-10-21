import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class ReservationNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.RESERVATION_NOT_FOUND, 'Reservation not found', 404);
  }
}

export class TableNotAvailableError extends AppError {
  constructor(message = 'Table is not available for the selected time') {
    super(ErrorCodes.TABLE_NOT_AVAILABLE, message, 409);
  }
}

export class InvalidReservationStatusError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.INVALID_RESERVATION_STATUS, message, 400);
  }
}
