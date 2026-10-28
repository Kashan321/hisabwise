import type {
  PlatformBusiness,
  SubscriptionAccessPhase,
  TenantSubscription,
} from '@/lib/api/types';

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

  const phase = business.accessPhase;
  if (phase === 'grace') return 'Grace period';
  if (phase === 'read_only') return 'Read-only';
  if (phase === 'locked') return 'Locked';
  if (phase === 'pending_verification') return 'Pending verification';

  const status = business.subscriptionStatus;
  const days = business.daysRemaining ?? getSubscriptionDaysRemaining(business);
  const expiredDays = business.daysExpired;

  if (expiredDays != null && expiredDays > 0 && phase !== 'active' && phase !== 'trial') {
    return `Expired ${expiredDays} day${expiredDays === 1 ? '' : 's'} ago`;
  }

  if (status === 'TRIAL') {
    return days != null ? `Trial · ${formatDaysRemaining(days)} left` : 'Trial';
  }

  if (status === 'ACTIVE') {
    return days != null ? `Active · ${formatDaysRemaining(days)} left` : 'Active';
  }

  return status.replace(/_/g, ' ');
}

export type PlatformSubscriptionFilter =
  | 'all'
  | 'active'
  | 'trial'
  | 'suspended'
  | 'expired'
  | 'expiring'
  | 'grace'
  | 'read_only'
  | 'locked';

export function platformBusinessMatchesFilter(
  business: PlatformBusiness,
  filter: PlatformSubscriptionFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'suspended') return business.isSuspended;
  if (filter === 'trial') return !business.isSuspended && business.subscriptionStatus === 'TRIAL';
  if (filter === 'active') {
    return (
      !business.isSuspended &&
      business.subscriptionStatus === 'ACTIVE' &&
      (business.accessPhase === 'active' || !business.accessPhase)
    );
  }
  if (filter === 'expired') {
    return (
      !business.isSuspended &&
      (business.accessPhase === 'locked' ||
        business.accessPhase === 'read_only' ||
        business.accessPhase === 'grace' ||
        (business.daysExpired != null && business.daysExpired > 0))
    );
  }
  if (filter === 'expiring') {
    const days = business.daysRemaining ?? getSubscriptionDaysRemaining(business);
    return days != null && days <= 7 && days > 0 && !business.isSuspended;
  }
  if (filter === 'grace') return business.accessPhase === 'grace';
  if (filter === 'read_only') return business.accessPhase === 'read_only';
  if (filter === 'locked') return business.accessPhase === 'locked';
  return true;
}

export function platformAccessPhaseBadge(
  phase: SubscriptionAccessPhase | undefined,
): 'expired' | 'warning' | null {
  if (phase === 'locked' || phase === 'read_only') return 'expired';
  if (phase === 'grace' || phase === 'pending_verification') return 'warning';
  return null;
}

export function isSubscriptionExpiryWarning(
  subscription: TenantSubscription | undefined,
  thresholdDays = 2,
): boolean {
  if (!subscription || subscription.isLocked || subscription.hasPendingPayment) return false;
  const days = getSubscriptionDaysRemaining(subscription);
  return days !== null && days <= thresholdDays;
}
