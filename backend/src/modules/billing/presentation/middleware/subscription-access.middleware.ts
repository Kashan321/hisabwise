import { NextFunction, Request, Response } from 'express';
import {
  SubscriptionReadOnlyError,
  SubscriptionLockedError,
} from '../../../auth/domain/errors/auth.errors';
import { prisma } from '../../../../shared/database/prisma-client';
import { billingSettingsRepository } from '../../infrastructure/billing-settings.repository';
import {
  resolveSubscriptionAccessPhase,
  subscriptionAllowsRead,
  subscriptionAllowsWrite,
} from '../../domain/subscription-access';

function isBillingRoute(req: Request): boolean {
  const url = req.originalUrl.split('?')[0];
  return url.startsWith('/api/v1/billing');
}

function isWriteMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export function shouldSkipSubscriptionCheck(req: Request): boolean {
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

export async function enforceSubscriptionAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (shouldSkipSubscriptionCheck(req)) {
    return next();
  }

  const businessId = req.tenantContext?.businessId;
  if (!businessId) {
    return next();
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      isSubscriptionBlocked: true,
      isSuspended: true,
      subscriptionTempAccessUntil: true,
    },
  });

  if (!business) {
    return next();
  }

  const settings = await billingSettingsRepository.getOrCreate();
  const phase = resolveSubscriptionAccessPhase(business, {
    gracePeriodDays: settings.gracePeriodDays,
    readOnlyPeriodDays: settings.readOnlyPeriodDays,
  });

  const billingRoute = isBillingRoute(req);

  if (!subscriptionAllowsRead(phase, billingRoute)) {
    return next(new SubscriptionLockedError());
  }

  if (isWriteMethod(req.method) && !subscriptionAllowsWrite(phase)) {
    if (phase === 'read_only') {
      return next(new SubscriptionReadOnlyError());
    }
    return next(new SubscriptionLockedError());
  }

  return next();
}
