import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class StaffNotFoundError extends AppError {
  constructor() {
    super(ErrorCodes.STAFF_NOT_FOUND, 'Staff member not found', 404);
  }
}

export class InvalidRoleError extends AppError {
  constructor(message = 'Invalid role assignment') {
    super(ErrorCodes.INVALID_ROLE, message, 400);
  }
}

export class CannotModifySelfError extends AppError {
  constructor() {
    super(ErrorCodes.CANNOT_MODIFY_SELF, 'You cannot modify your own account through this endpoint', 400);
  }
}

export class LastOwnerError extends AppError {
  constructor() {
    super(ErrorCodes.LAST_OWNER, 'Cannot remove or deactivate the last owner', 400);
  }
}

export class DuplicateEmailError extends AppError {
  constructor() {
    super(ErrorCodes.DUPLICATE_EMAIL, 'This email is already registered', 409);
  }
}

export class StaffCannotDeleteError extends AppError {
  constructor() {
    super(
      ErrorCodes.STAFF_CANNOT_DELETE,
      'This staff member has linked activity and cannot be deleted. Deactivate their account instead.',
      400,
    );
  }
}
