export type BusinessDayReminderCode = 'ROLLOVER_STALE_DAY' | 'OPEN_SHIFTS_BLOCKING_CLOSE';

export interface BusinessDayLifecycleReminder {
  code: BusinessDayReminderCode;
  openBusinessDate: string;
  currentBusinessDate: string;
  businessDayId: string;
  hasOpenShifts: boolean;
}

export interface BusinessDayLifecycleAutoClosed {
  businessDayId: string;
  businessDate: string;
}

export interface BusinessDayLifecycle {
  reminder?: BusinessDayLifecycleReminder;
  autoClosed?: BusinessDayLifecycleAutoClosed;
}

export function shouldAutoCloseStaleBusinessDay(input: {
  openBusinessDate: string;
  currentBusinessDate: string;
  autoCloseEnabled: boolean;
  hasOpenShifts: boolean;
}): boolean {
  if (input.openBusinessDate === input.currentBusinessDate) return false;
  if (!input.autoCloseEnabled) return false;
  return !input.hasOpenShifts;
}

export function buildStaleBusinessDayReminder(input: {
  openBusinessDate: string;
  currentBusinessDate: string;
  businessDayId: string;
  hasOpenShifts: boolean;
  reminderEnabled: boolean;
}): BusinessDayLifecycleReminder | undefined {
  if (input.openBusinessDate === input.currentBusinessDate) return undefined;
  if (!input.reminderEnabled) return undefined;

  return {
    code: input.hasOpenShifts ? 'OPEN_SHIFTS_BLOCKING_CLOSE' : 'ROLLOVER_STALE_DAY',
    openBusinessDate: input.openBusinessDate,
    currentBusinessDate: input.currentBusinessDate,
    businessDayId: input.businessDayId,
    hasOpenShifts: input.hasOpenShifts,
  };
}
