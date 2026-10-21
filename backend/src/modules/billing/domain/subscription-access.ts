import { SubscriptionStatus } from '@prisma/client';

export type SubscriptionBusiness = {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  isSubscriptionBlocked?: boolean;
};

export type SubscriptionAccessContext = SubscriptionBusiness & {
  hasPendingPayment?: boolean;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysUntil(date: Date | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY));
}

/** End date of the current access period (trial or paid subscription). */
export function getAccessPeriodEnd(
  business: SubscriptionBusiness,
  now = new Date(),
): Date | null {
  if (business.subscriptionStatus === 'ACTIVE') {
    return business.subscriptionEndsAt;
  }

  if (business.subscriptionStatus === 'TRIAL') {
    if (business.subscriptionEndsAt && business.subscriptionEndsAt > now) {
      return business.subscriptionEndsAt;
    }
    return business.trialEndsAt;
  }

  return business.subscriptionEndsAt ?? business.trialEndsAt;
}

export function getSubscriptionDaysRemaining(
  business: SubscriptionBusiness,
  now = new Date(),
): number | null {
  return daysUntil(getAccessPeriodEnd(business, now), now);
}

export function isSubscriptionLocked(
  business: SubscriptionAccessContext,
  now = new Date(),
): boolean {
  if (business.isSubscriptionBlocked) {
    return true;
  }

  if (business.subscriptionStatus === 'ACTIVE') {
    if (business.subscriptionEndsAt && business.subscriptionEndsAt < now) {
      return true;
    }
    return false;
  }

  if (business.subscriptionStatus === 'TRIAL') {
    if (business.hasPendingPayment) {
      return false;
    }

    if (business.subscriptionEndsAt && business.subscriptionEndsAt > now) {
      return false;
    }

    if (business.trialEndsAt && business.trialEndsAt < now) {
      return true;
    }

    return false;
  }

  return true;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addIntervalEnd(from: Date, interval: 'MONTHLY' | 'YEARLY'): Date {
  const result = new Date(from);
  if (interval === 'MONTHLY') {
    result.setMonth(result.getMonth() + 1);
  } else {
    result.setFullYear(result.getFullYear() + 1);
  }
  return result;
}
