import { billingSettingsRepository } from './billing-settings.repository';
import {
  getAccessPeriodEnd,
  getSubscriptionDaysRemaining,
  resolveSubscriptionAccessPhase,
} from '../domain/subscription-access';
import { resolveTenantMonthlyPrice } from '../domain/subscription-pricing';
import { prisma } from '../../../shared/database/prisma-client';

const MS_PER_DAY = 86400000;

export type PlatformBusinessSubscriptionView = {
  accessPhase: ReturnType<typeof resolveSubscriptionAccessPhase>;
  periodEndsAt: string | null;
  daysRemaining: number | null;
  daysExpired: number | null;
  hasPendingPayment: boolean;
  tempAccessUntil: string | null;
  customMonthlyPrice: number | null;
  effectiveMonthlyPrice: number;
};

type BusinessRow = {
  id: string;
  subscriptionStatus: import('@prisma/client').SubscriptionStatus;
  isSuspended: boolean;
  isSubscriptionBlocked: boolean;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  subscriptionTempAccessUntil: Date | null;
  customMonthlyPrice: number | null;
};

export async function buildPlatformBusinessSubscriptionViews(
  businesses: BusinessRow[],
): Promise<Map<string, PlatformBusinessSubscriptionView>> {
  const settings = await billingSettingsRepository.getOrCreate();
  const lifecycle = {
    gracePeriodDays: settings.gracePeriodDays,
    readOnlyPeriodDays: settings.readOnlyPeriodDays,
  };
  const globalMonthly = Number(settings.monthlyPrice.toString());

  const pendingRows = await prisma.paymentSubmission.findMany({
    where: { status: 'PENDING', businessId: { in: businesses.map((b) => b.id) } },
    select: { businessId: true },
  });
  const pendingSet = new Set(pendingRows.map((r) => r.businessId));

  const now = Date.now();
  const map = new Map<string, PlatformBusinessSubscriptionView>();

  for (const business of businesses) {
    const accessPhase = resolveSubscriptionAccessPhase(
      {
        subscriptionStatus: business.subscriptionStatus,
        isSuspended: business.isSuspended,
        isSubscriptionBlocked: business.isSubscriptionBlocked,
        trialEndsAt: business.trialEndsAt,
        subscriptionEndsAt: business.subscriptionEndsAt,
        subscriptionTempAccessUntil: business.subscriptionTempAccessUntil,
      },
      lifecycle,
    );
    const periodEnd = getAccessPeriodEnd(business);
    const daysRemaining = getSubscriptionDaysRemaining(business);
    let daysExpired: number | null = null;
    if (periodEnd && periodEnd.getTime() < now) {
      daysExpired = Math.ceil((now - periodEnd.getTime()) / MS_PER_DAY);
    }
    const customMonthly = business.customMonthlyPrice;
    map.set(business.id, {
      accessPhase,
      periodEndsAt: periodEnd?.toISOString() ?? null,
      daysRemaining,
      daysExpired,
      hasPendingPayment: pendingSet.has(business.id),
      tempAccessUntil: business.subscriptionTempAccessUntil?.toISOString() ?? null,
      customMonthlyPrice: customMonthly,
      effectiveMonthlyPrice: resolveTenantMonthlyPrice(globalMonthly, customMonthly),
    });
  }

  return map;
}

export function computeExpiryReminderDays(daysRemaining: number | null): 7 | 3 | 1 | null {
  if (daysRemaining == null) return null;
  if (daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1) {
    return daysRemaining;
  }
  return null;
}
