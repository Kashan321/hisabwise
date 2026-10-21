import type { PlatformBusiness, TenantSubscription } from '@/lib/api/types';

type SubscriptionLike = {
  status?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  daysRemaining?: number | null;
  periodEndsAt?: string | null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function subscriptionStatusOf(input: SubscriptionLike): string {
  return input.status ?? input.subscriptionStatus ?? '';
}

export function getSubscriptionPeriodEnd(input: SubscriptionLike): Date | null {
  if (input.periodEndsAt) {
    return new Date(input.periodEndsAt);
  }

  const status = subscriptionStatusOf(input);
  const now = Date.now();

  if (status === 'ACTIVE' && input.subscriptionEndsAt) {
    return new Date(input.subscriptionEndsAt);
  }

  if (status === 'TRIAL') {
    if (input.subscriptionEndsAt) {
      const paidEnd = new Date(input.subscriptionEndsAt);
      if (paidEnd.getTime() > now) return paidEnd;
    }
    if (input.trialEndsAt) return new Date(input.trialEndsAt);
  }

  if (input.subscriptionEndsAt) return new Date(input.subscriptionEndsAt);
  if (input.trialEndsAt) return new Date(input.trialEndsAt);
  return null;
}

export function computeDaysRemaining(end: Date | null, now = Date.now()): number | null {
  if (!end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now) / MS_PER_DAY));
}

export function getSubscriptionDaysRemaining(input: SubscriptionLike): number | null {
  if (input.daysRemaining != null) return input.daysRemaining;
  return computeDaysRemaining(getSubscriptionPeriodEnd(input));
}

export function formatDaysRemaining(days: number): string {
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function adminSubscriptionAccessLabel(business: PlatformBusiness): string {
  if (business.isSuspended) return 'Suspended';
  if (business.isSubscriptionBlocked) return 'Blocked';

  const status = business.subscriptionStatus;
  const days = getSubscriptionDaysRemaining(business);

  if (status === 'TRIAL') {
    return days != null ? `Trial · ${formatDaysRemaining(days)} left` : 'Trial';
  }

  if (status === 'ACTIVE') {
    return days != null ? `Active · ${formatDaysRemaining(days)} left` : 'Active';
  }

  return status.replace(/_/g, ' ');
}

export function isSubscriptionExpiryWarning(
  subscription: TenantSubscription | undefined,
  thresholdDays = 2,
): boolean {
  if (!subscription || subscription.isLocked || subscription.hasPendingPayment) return false;
  const days = getSubscriptionDaysRemaining(subscription);
  return days !== null && days <= thresholdDays;
}
