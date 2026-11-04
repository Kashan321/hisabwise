import { env } from '../../config/env';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date YYYY-MM-DD in an IANA timezone (en-CA locale). */
export function calendarDateInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function platformCalendarToday(): string {
  return calendarDateInTimezone(new Date(), env.ORDER_DAY_TIMEZONE);
}

export function isValidCalendarDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function assertDateRange(startDate: string, endDate: string): void {
  if (!isValidCalendarDateString(startDate) || !isValidCalendarDateString(endDate)) {
    throw new Error('INVALID_DATE');
  }
  if (endDate < startDate) {
    throw new Error('INVALID_RANGE');
  }
}

export function isCalendarDateInRange(today: string, startDate: string, endDate: string): boolean {
  return today >= startDate && today <= endDate;
}
