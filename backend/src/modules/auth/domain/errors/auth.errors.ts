import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
  }
}

export class UserInactiveError extends AppError {
  constructor() {
    super(ErrorCodes.USER_INACTIVE, 'User account is inactive', 403);
  }
}

export class DuplicateEmailError extends AppError {
  constructor() {
    super(ErrorCodes.DUPLICATE_EMAIL, 'This email is already registered', 409);
  }
}

export class DuplicateSlugError extends AppError {
  constructor() {
    super(ErrorCodes.DUPLICATE_SLUG, 'Business slug is already taken', 409);
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super(ErrorCodes.TOKEN_EXPIRED, 'Refresh token expired', 401);
  }
}

export class TokenReusedError extends AppError {
  constructor() {
    super(ErrorCodes.TOKEN_REUSED, 'Refresh token reuse detected', 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(ErrorCodes.UNAUTHORIZED, message, 401);
  }
}

export class BusinessSuspendedError extends AppError {
  constructor() {
    super(
      ErrorCodes.BUSINESS_SUSPENDED,
      'This business has been suspended. Contact platform support.',
      403,
    );
  }
}

export class SubscriptionLockedError extends AppError {
  constructor() {
    super(
      ErrorCodes.SUBSCRIPTION_LOCKED,
      'Your trial has ended or subscription is inactive. Please renew to continue.',
      403,
    );
  }
}

export class SubscriptionReadOnlyError extends AppError {
  constructor() {
    super(
      ErrorCodes.SUBSCRIPTION_READ_ONLY,
      'Your subscription has expired. Your account is read-only until you renew.',
      403,
    );
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(ErrorCodes.FORBIDDEN, message, 403);
  }
}
