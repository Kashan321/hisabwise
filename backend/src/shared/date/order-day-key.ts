import { env } from '../../config/env';

/** Calendar day for order ticket numbering (YYYY-MM-DD in the configured timezone). */
export function getOrderDayKey(date = new Date(), timeZone = env.ORDER_DAY_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** YYMMDD suffix for order labels (e.g. 2026-09-17 → 260917). */
export function formatOrderTicketDateSuffix(dayKey: string): string {
  const [year, month, day] = dayKey.split('-');
  if (!year || !month || !day) {
    return formatOrderTicketDateSuffix(getOrderDayKey());
  }
  return `${year.slice(-2)}${month}${day}`;
}
