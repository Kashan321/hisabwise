import { NextFunction, Request, Response } from 'express';
import { authModule } from '../../infrastructure/auth.module';
import {
  BusinessSuspendedError,
  ForbiddenError,
  UnauthorizedError,
} from '../../domain/errors/auth.errors';
import {
  runWithTenantContextAsync,
} from '../../../../shared/tenant-context/tenant-context';
import { prisma } from '../../../../shared/database/prisma-client';
import { enforceSubscriptionAccess } from '../../../billing/presentation/middleware/subscription-access.middleware';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Access token missing'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = authModule.tokenService.verifyAccessToken(token);

    if (!payload.sub || !payload.businessId) {
      return next(new UnauthorizedError('Invalid access token. Please log in again.'));
    }

    if (await authModule.businessRepository.isSuspended(payload.businessId)) {
      return next(new BusinessSuspendedError());
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { name: true },
    });

    req.tenantContext = {
      userId: payload.sub,
      businessId: payload.businessId,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      userName: user?.name,
    };

    return runWithTenantContextAsync(req.tenantContext, () =>
      enforceSubscriptionAccess(req, _res, next),
    );
  } catch (error) {
    return next(error);
  }
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return next(new UnauthorizedError());
    }

    const permissions = req.tenantContext.permissions ?? [];
    const allowed = permissions.includes('*') || permissions.includes(permission);

    if (!allowed) {
      return next(new ForbiddenError(`Missing permission: ${permission}`));
    }

    return next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return next(new UnauthorizedError());
    }

    const userPermissions = req.tenantContext.permissions ?? [];
    const allowed = permissions.some(
      (permission) => userPermissions.includes('*') || userPermissions.includes(permission),
    );
    if (!allowed) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    return next();
  };
}
