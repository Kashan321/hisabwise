import { SubscriptionStatus } from '@prisma/client';
import { addDays, computeRenewalPeriodEnd, startOfDayInTimeZone } from './subscription-period';

export type SubscriptionBusiness = {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  isSubscriptionBlocked?: boolean;
  isSuspended?: boolean;
  subscriptionTempAccessUntil?: Date | null;
};

export type SubscriptionAccessContext = SubscriptionBusiness & {
  hasPendingPayment?: boolean;
};

export type SubscriptionLifecycleSettings = {
  gracePeriodDays: number;
  readOnlyPeriodDays: number;
  timeZone?: string;
};

export type SubscriptionAccessPhase =
  | 'active'
  | 'trial'
  | 'grace'
  | 'read_only'
  | 'locked'
  | 'pending_verification'
  | 'suspended';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TEMP_ACCESS_HOURS = 48;

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

function hasValidTempAccess(business: SubscriptionBusiness, now: Date): boolean {
  return Boolean(
    business.subscriptionTempAccessUntil && business.subscriptionTempAccessUntil > now,
  );
}

function isPeriodEnded(periodEnd: Date | null, now: Date, timeZone: string): boolean {
  if (!periodEnd) return false;
  const endDay = startOfDayInTimeZone(periodEnd, timeZone);
  const today = startOfDayInTimeZone(now, timeZone);
  return today.getTime() >= endDay.getTime();
}

export function resolveSubscriptionAccessPhase(
  business: SubscriptionAccessContext,
  settings: SubscriptionLifecycleSettings,
  now = new Date(),
): SubscriptionAccessPhase {
  if (business.isSuspended) {
    return 'suspended';
  }

  if (business.isSubscriptionBlocked) {
    return 'locked';
  }

  const timeZone = settings.timeZone ?? 'Asia/Karachi';
  const periodEnd = getAccessPeriodEnd(business, now);
  const periodEnded = isPeriodEnded(periodEnd, now, timeZone);

  if (hasValidTempAccess(business, now)) {
    return 'pending_verification';
  }

  if (
    business.subscriptionStatus === 'ACTIVE' ||
    business.subscriptionStatus === 'TRIAL'
  ) {
    if (!periodEnded) {
      return business.subscriptionStatus === 'TRIAL' ? 'trial' : 'active';
    }

    const graceEnd = periodEnd
      ? addDays(startOfDayInTimeZone(periodEnd, timeZone), settings.gracePeriodDays)
      : null;
    if (graceEnd && now < graceEnd) {
      return 'grace';
    }

    const readOnlyEnd = graceEnd
      ? addDays(graceEnd, settings.readOnlyPeriodDays)
      : null;
    if (readOnlyEnd && now < readOnlyEnd) {
      return 'read_only';
    }

    return 'locked';
  }

  return 'locked';
}

export function subscriptionAllowsRead(
  phase: SubscriptionAccessPhase,
  isBillingRoute: boolean,
): boolean {
  if (phase === 'locked') {
    return isBillingRoute;
  }
  return phase !== 'suspended';
}

export function subscriptionAllowsWrite(phase: SubscriptionAccessPhase): boolean {
  return (
    phase === 'active' ||
    phase === 'trial' ||
    phase === 'grace' ||
    phase === 'pending_verification'
  );
}

/** @deprecated Use resolveSubscriptionAccessPhase + subscriptionAllowsWrite */
export function isSubscriptionLocked(
  business: SubscriptionAccessContext,
  now = new Date(),
  settings: SubscriptionLifecycleSettings = { gracePeriodDays: 0, readOnlyPeriodDays: 0 },
): boolean {
  const phase = resolveSubscriptionAccessPhase(business, settings, now);
  return phase === 'locked' || phase === 'suspended';
}

export function addDaysLegacy(date: Date, days: number): Date {
  return addDays(date, days);
}

export { addDays };

export function addIntervalEnd(from: Date, interval: 'MONTHLY' | 'YEARLY'): Date {
  const months = interval === 'YEARLY' ? 12 : 1;
  return computeRenewalPeriodEnd(from, months);
}

export function tempAccessDurationMs(): number {
  return TEMP_ACCESS_HOURS * 60 * 60 * 1000;
}

export function computeTempAccessUntil(from: Date): Date {
  return new Date(from.getTime() + tempAccessDurationMs());
}
