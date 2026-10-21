import { NextFunction, Request, Response } from 'express';
import { authModule } from '../../infrastructure/auth.module';
import {
  BusinessSuspendedError,
  ForbiddenError,
  SubscriptionLockedError,
  UnauthorizedError,
} from '../../domain/errors/auth.errors';
import { runWithTenantContext } from '../../../../shared/tenant-context/tenant-context';
import { prisma } from '../../../../shared/database/prisma-client';
import { isSubscriptionLocked } from '../../../billing/domain/subscription-access';

function shouldSkipSubscriptionCheck(req: Request): boolean {
  const url = req.originalUrl.split('?')[0];
  const allowedPrefixes = [
    '/api/v1/billing',
    '/api/v1/auth/logout',
    '/api/v1/auth/me',
    '/api/v1/auth/refresh',
    '/api/v1/files/upload',
  ];
  return allowedPrefixes.some((prefix) => url.startsWith(prefix));
}

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

    if (!shouldSkipSubscriptionCheck(req)) {
      const business = await prisma.business.findUnique({
        where: { id: payload.businessId },
        select: {
          subscriptionStatus: true,
          trialEndsAt: true,
          subscriptionEndsAt: true,
          isSubscriptionBlocked: true,
        },
      });
      if (business) {
        const pendingPayment = await prisma.paymentSubmission.findFirst({
          where: { businessId: payload.businessId, status: 'PENDING' },
          select: { id: true },
        });
        if (isSubscriptionLocked({ ...business, hasPendingPayment: Boolean(pendingPayment) })) {
          return next(new SubscriptionLockedError());
        }
      }
    }

    return runWithTenantContext(req.tenantContext, () => next());
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
