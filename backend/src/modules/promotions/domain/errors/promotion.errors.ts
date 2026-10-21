import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class PromotionNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.PROMOTION_NOT_FOUND, 'Promotion not found', 404);
  }
}
