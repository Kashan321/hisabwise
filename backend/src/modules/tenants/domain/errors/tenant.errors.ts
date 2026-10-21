import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class BusinessNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.BUSINESS_NOT_FOUND, 'Business not found', 404);
  }
}
