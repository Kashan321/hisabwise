import {
  resolveSubscriptionAccessPhase,
  subscriptionAllowsWrite,
} from '../../../src/modules/billing/domain/subscription-access';

const settings = { gracePeriodDays: 2, readOnlyPeriodDays: 7 };

describe('resolveSubscriptionAccessPhase', () => {
  it('returns grace after period end within grace window', () => {
    const phase = resolveSubscriptionAccessPhase(
      {
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date('2026-10-26T00:00:00.000Z'),
        trialEndsAt: null,
      },
      settings,
      new Date('2026-10-27T12:00:00.000Z'),
    );
    expect(phase).toBe('grace');
    expect(subscriptionAllowsWrite(phase)).toBe(true);
  });

  it('returns read_only after grace window', () => {
    const phase = resolveSubscriptionAccessPhase(
      {
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date('2026-10-20T00:00:00.000Z'),
        trialEndsAt: null,
      },
      settings,
      new Date('2026-10-27T12:00:00.000Z'),
    );
    expect(phase).toBe('read_only');
    expect(subscriptionAllowsWrite(phase)).toBe(false);
  });

  it('returns pending_verification when temp access is active', () => {
    const phase = resolveSubscriptionAccessPhase(
      {
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date('2026-10-20T00:00:00.000Z'),
        trialEndsAt: null,
        subscriptionTempAccessUntil: new Date('2026-10-29T00:00:00.000Z'),
      },
      settings,
      new Date('2026-10-28T12:00:00.000Z'),
    );
    expect(phase).toBe('pending_verification');
    expect(subscriptionAllowsWrite(phase)).toBe(true);
  });
});
