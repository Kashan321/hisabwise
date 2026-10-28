const DEFAULT_TIMEZONE = 'Asia/Karachi';

/** Start of calendar day in the given IANA timezone (for expiry boundaries). */
export function startOfDayInTimeZone(date: Date, timeZone = DEFAULT_TIMEZONE): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/** Add calendar months, clamping day-of-month (31 Jan + 1 month → last day of Feb). */
export function addCalendarMonths(from: Date, months: number): Date {
  const result = new Date(from);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Paid period end (exclusive): first instant of the day after the last included day.
 * Example: start 28 Oct + 1 month → active through 27 Nov, ends at 28 Nov 00:00 UTC slice of start day logic.
 */
export function computeRenewalPeriodEnd(periodStart: Date, durationMonths: number): Date {
  const startDay = startOfDayInTimeZone(periodStart);
  return addCalendarMonths(startDay, durationMonths);
}

/** Inclusive last day of access for display. */
export function lastInclusiveAccessDay(periodEndExclusive: Date): Date {
  const d = new Date(periodEndExclusive);
  d.setDate(d.getDate() - 1);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
