import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';
import { env } from '../../config/env';
import { handleAppError, fail, handleUnknownError } from './api-response';
import { logger } from '../logger/logger';
import { FileTooLargeError } from '../../modules/files/domain/errors/file.errors';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    return handleAppError(res, error);
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return handleAppError(res, new FileTooLargeError());
    }
    return fail(res, ErrorCodes.VALIDATION_ERROR, error.message, 400);
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error.flatten(),
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') {
      return fail(
        res,
        ErrorCodes.INTERNAL_ERROR,
        'Database schema is out of date. Run: npx prisma migrate dev',
        500,
      );
    }

    if (error.code === 'P2003') {
      return fail(
        res,
        ErrorCodes.CONFLICT,
        'This action could not be completed because related records still exist. Remove dependent data first or contact support.',
        409,
      );
    }
  }

  logger.error({ err: error }, 'Unhandled error');

  if (env.NODE_ENV === 'development' && error instanceof Error) {
    return fail(res, ErrorCodes.INTERNAL_ERROR, error.message, 500);
  }

  return handleUnknownError(res);
}
