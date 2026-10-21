import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { PASSWORD } from '../../../../config/constants';

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalized)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid email address', 400);
    }

    return new Email(normalized);
  }
}

export class Password {
  private constructor(public readonly value: string) {}

  static create(raw: string): Password {
    if (raw.length < PASSWORD.MIN_LENGTH) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Password must be at least ${PASSWORD.MIN_LENGTH} characters`,
        400,
      );
    }

    return new Password(raw);
  }

  static fromHash(hash: string): Password {
    return new Password(hash);
  }
}

export class BusinessSlug {
  private constructor(public readonly value: string) {}

  static create(raw: string): BusinessSlug {
    const normalized = raw.trim().toLowerCase();
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (!slugRegex.test(normalized)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Slug must contain lowercase letters, numbers, and hyphens only',
        400,
      );
    }

    return new BusinessSlug(normalized);
  }
}
