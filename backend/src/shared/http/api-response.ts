import { Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';

export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function fail(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}

export function handleAppError(res: Response, error: AppError) {
  return fail(res, error.code, error.message, error.statusCode, error.details);
}

export function handleUnknownError(res: Response) {
  return fail(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
}
