import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class FileStorageNotConfiguredError extends AppError {
  constructor() {
    super(
      ErrorCodes.FILE_STORAGE_NOT_CONFIGURED,
      'File storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME (or legacy COS_* variables).',
      503,
    );
  }
}

export class InvalidFileTypeError extends AppError {
  constructor() {
    super(
      ErrorCodes.INVALID_FILE_TYPE,
      'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, SVG, PDF.',
      400,
    );
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxMb?: number) {
    super(
      ErrorCodes.FILE_TOO_LARGE,
      maxMb ? `File exceeds the ${maxMb}MB limit.` : 'File is too large.',
      400,
    );
  }
}

export class FileUploadFailedError extends AppError {
  constructor(message = 'File upload failed.') {
    super(ErrorCodes.FILE_UPLOAD_FAILED, message, 502);
  }
}

export class FileRequiredError extends AppError {
  constructor() {
    super(ErrorCodes.VALIDATION_ERROR, 'A file is required.', 400);
  }
}
