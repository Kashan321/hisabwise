import {
  buildStaleBusinessDayReminder,
  shouldAutoCloseStaleBusinessDay,
} from '../../../src/modules/business-day/application/business-day-lifecycle';

describe('business-day lifecycle', () => {
  it('auto-closes when the logical date rolled over and no shifts are open', () => {
    expect(
      shouldAutoCloseStaleBusinessDay({
        openBusinessDate: '2026-09-23',
        currentBusinessDate: '2026-09-24',
        autoCloseEnabled: true,
        hasOpenShifts: false,
      }),
    ).toBe(true);
  });

  it('does not auto-close when shifts are still open', () => {
    expect(
      shouldAutoCloseStaleBusinessDay({
        openBusinessDate: '2026-09-23',
        currentBusinessDate: '2026-09-24',
        autoCloseEnabled: true,
        hasOpenShifts: true,
      }),
    ).toBe(false);
  });

  it('builds rollover reminder when auto-close cannot run', () => {
    const reminder = buildStaleBusinessDayReminder({
      openBusinessDate: '2026-09-23',
      currentBusinessDate: '2026-09-24',
      businessDayId: 'day-1',
      hasOpenShifts: true,
      reminderEnabled: true,
    });

    expect(reminder?.code).toBe('OPEN_SHIFTS_BLOCKING_CLOSE');
  });
});
