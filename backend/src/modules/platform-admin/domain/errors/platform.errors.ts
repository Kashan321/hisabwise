import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class PlatformUnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(ErrorCodes.UNAUTHORIZED, message, 401);
  }
}

export class PlatformForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(ErrorCodes.FORBIDDEN, message, 403);
  }
}

export class PlatformInvalidCredentialsError extends AppError {
  constructor() {
    super(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
  }
}

export class PlatformUserInactiveError extends AppError {
  constructor() {
    super(ErrorCodes.USER_INACTIVE, 'Platform account is inactive', 403);
  }
}

export class PlatformUserNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.NOT_FOUND, 'Platform user not found', 404);
  }
}

export class BusinessNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.NOT_FOUND, 'Business not found', 404);
  }
}

export class DuplicatePlatformEmailError extends AppError {
  constructor() {
    super(ErrorCodes.DUPLICATE_EMAIL, 'Platform email already in use', 409);
  }
}

export class CannotModifySuperAdminError extends AppError {
  constructor() {
    super(ErrorCodes.FORBIDDEN, 'Cannot modify the last super admin', 403);
  }
}
