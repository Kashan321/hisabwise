export interface ReportDateRangeInput {
  from?: string;
  to?: string;
}

function parseDayStart(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function parseDayEnd(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export function resolveReportDateRange(input?: ReportDateRangeInput): { from: Date; to: Date } {
  const from = input?.from ? parseDayStart(input.from) : startOfToday();
  const to = input?.to ? parseDayEnd(input.to) : endOfToday();

  if (from.getTime() > to.getTime()) {
    return { from: to, to: from };
  }

  return { from, to };
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** How sales-over-time buckets are grouped for a report range. */
export type SalesTrendGranularity = 'hour' | 'day' | 'hourOfDay';

export function resolveSalesTrendGranularity(
  from: Date,
  to: Date,
  fromKey?: string,
  toKey?: string,
): SalesTrendGranularity {
  const fromStr = fromKey ?? formatDateKey(from);
  const toStr = toKey ?? formatDateKey(to);
  if (fromStr === toStr) return 'hour';

  const rangeMs = Math.max(0, to.getTime() - from.getTime());
  const rangeDays = Math.floor(rangeMs / (24 * 60 * 60 * 1000)) + 1;

  if (rangeDays <= 7) return 'hour';
  if (rangeDays <= 45) return 'hourOfDay';
  return 'day';
}

export function salesTrendBucketKey(date: Date, granularity: SalesTrendGranularity): string {
  const hour = String(date.getHours()).padStart(2, '0');
  if (granularity === 'hour') {
    return `${formatDateKey(date)} ${hour}:00`;
  }
  if (granularity === 'hourOfDay') {
    return `${hour}:00`;
  }
  return formatDateKey(date);
}
