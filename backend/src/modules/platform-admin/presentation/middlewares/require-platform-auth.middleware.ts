import { NextFunction, Request, Response } from 'express';
import { hasPlatformPermission } from '../../../../config/platform.constants';
import { authModule } from '../../../auth/infrastructure/auth.module';
import {
  PlatformForbiddenError,
  PlatformUnauthorizedError,
} from '../../domain/errors/platform.errors';

export function requirePlatformAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new PlatformUnauthorizedError('Access token missing'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = authModule.tokenService.verifyPlatformAccessToken(token);

    if (!payload.sub || payload.scope !== 'platform') {
      return next(new PlatformUnauthorizedError('Invalid access token. Please log in again.'));
    }

    req.platformContext = {
      platformUserId: payload.sub,
      platformRole: payload.platformRole,
      permissions: payload.permissions ?? [],
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requirePlatformPermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.platformContext) {
      return next(new PlatformUnauthorizedError());
    }

    if (!hasPlatformPermission(req.platformContext.permissions, permission)) {
      return next(new PlatformForbiddenError(`Missing permission: ${permission}`));
    }

    return next();
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.platformContext) {
    return next(new PlatformUnauthorizedError());
  }

  if (req.platformContext.platformRole !== 'SUPER_ADMIN') {
    return next(new PlatformForbiddenError('Super admin access required'));
  }

  return next();
}
