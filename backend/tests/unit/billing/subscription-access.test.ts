import {
  getAccessPeriodEnd,
  getSubscriptionDaysRemaining,
  isSubscriptionLocked,
} from '../../../src/modules/billing/domain/subscription-access';

const now = new Date('2026-03-01T12:00:00.000Z');

describe('isSubscriptionLocked', () => {
  it('unlocks ACTIVE subscription before subscriptionEndsAt', () => {
    expect(
      isSubscriptionLocked(
        {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
          subscriptionEndsAt: new Date('2026-03-15T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('locks ACTIVE subscription after subscriptionEndsAt', () => {
    expect(
      isSubscriptionLocked(
        {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
          subscriptionEndsAt: new Date('2026-02-28T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(true);
  });

  it('does not lock TRIAL tenant with pending payment after trial end', () => {
    expect(
      isSubscriptionLocked(
        {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date('2026-02-28T00:00:00.000Z'),
          subscriptionEndsAt: null,
          hasPendingPayment: true,
        },
        now,
      ),
    ).toBe(false);
  });

  it('does not lock TRIAL tenant with future paid subscriptionEndsAt', () => {
    expect(
      isSubscriptionLocked(
        {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date('2026-02-28T00:00:00.000Z'),
          subscriptionEndsAt: new Date('2026-03-31T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('locks TRIAL tenant after trial end without pending payment', () => {
    expect(
      isSubscriptionLocked(
        {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date('2026-02-28T00:00:00.000Z'),
          subscriptionEndsAt: null,
          hasPendingPayment: false,
        },
        now,
      ),
    ).toBe(true);
  });

  it('ignores past trialEndsAt when status is ACTIVE with valid subscription', () => {
    expect(
      isSubscriptionLocked(
        {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: new Date('2026-02-28T00:00:00.000Z'),
          subscriptionEndsAt: new Date('2026-03-31T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });
});

describe('getAccessPeriodEnd', () => {
  it('returns subscriptionEndsAt for ACTIVE tenants', () => {
    const end = new Date('2026-03-31T00:00:00.000Z');
    expect(
      getAccessPeriodEnd(
        {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: new Date('2026-02-01T00:00:00.000Z'),
          subscriptionEndsAt: end,
        },
        now,
      ),
    ).toEqual(end);
  });

  it('returns paid end date for TRIAL tenants with approved subscription', () => {
    const end = new Date('2026-03-31T00:00:00.000Z');
    expect(
      getAccessPeriodEnd(
        {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date('2026-02-28T00:00:00.000Z'),
          subscriptionEndsAt: end,
        },
        now,
      ),
    ).toEqual(end);
  });
});

describe('getSubscriptionDaysRemaining', () => {
  it('counts days until subscription end', () => {
    expect(
      getSubscriptionDaysRemaining(
        {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
          subscriptionEndsAt: new Date('2026-03-31T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(30);
  });
});
