export type ReportPreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'lastMonth'
  | '7d'
  | '30d'
  | 'custom';

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Open business day, or logical business date when no day is open. */
export function resolveTodayBusinessDateContext(
  state?: {
    businessDay?: { businessDate: string } | null;
    currentBusinessDate?: string;
  } | null,
): { businessDate: string } | null {
  if (state?.businessDay?.businessDate) {
    return { businessDate: state.businessDay.businessDate };
  }
  if (state?.currentBusinessDate) {
    return { businessDate: state.currentBusinessDate };
  }
  return null;
}

export function getReportPresetRange(
  preset: ReportPreset,
  currentBusinessDay?: { businessDate: string } | null,
): { from: string; to: string } {
  if (preset === 'today' && currentBusinessDay?.businessDate) {
    return { from: currentBusinessDay.businessDate, to: currentBusinessDay.businessDate };
  }

  const to = new Date();
  const from = new Date();

  if (preset === 'yesterday') {
    from.setDate(from.getDate() - 1);
    to.setDate(to.getDate() - 1);
  } else if (preset === 'week') {
    const day = from.getDay();
    const diff = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diff);
  } else if (preset === 'lastMonth') {
    from.setMonth(from.getMonth() - 1, 1);
    to.setDate(0);
  } else if (preset === '7d') {
    from.setDate(from.getDate() - 6);
  } else if (preset === '30d') {
    from.setDate(from.getDate() - 29);
  } else if (preset === 'month') {
    from.setDate(1);
  }

  return { from: formatDateInput(from), to: formatDateInput(to) };
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const SALES_TREND_HOURLY = /^(\d{4}-\d{2}-\d{2}) (\d{2}):00$/;
const SALES_TREND_DAILY = /^\d{4}-\d{2}-\d{2}$/;
const SALES_TREND_HOUR_OF_DAY = /^(\d{2}):00$/;

function formatTrendHour12(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}${period}`;
}

function formatTrendShortDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
  });
}

/** X-axis label for sales-over-time buckets returned by the API. */
export function formatSalesTrendBucketLabel(
  bucket: string,
  range?: { from: string; to: string },
): string {
  const hourOfDay = SALES_TREND_HOURLY.exec(bucket);
  if (hourOfDay) {
    const [, ymd, hh] = hourOfDay;
    const timeLabel = formatTrendHour12(Number(hh));
    if (range?.from && range?.to && range.from === range.to) {
      return timeLabel;
    }
    return `${formatTrendShortDate(ymd!)} ${timeLabel}`;
  }

  const clockHour = SALES_TREND_HOUR_OF_DAY.exec(bucket);
  if (clockHour) {
    return formatTrendHour12(Number(clockHour[1]));
  }

  if (SALES_TREND_DAILY.test(bucket)) {
    return formatTrendShortDate(bucket);
  }

  return bucket;
}

export function isSalesTrendHourOfDayBucket(bucket: string): boolean {
  return SALES_TREND_HOUR_OF_DAY.test(bucket);
}

export function formatReportRangeLabel(from: string, to: string): string {
  if (from === to) {
    return new Date(`${from}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const fromLabel = new Date(`${from}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const toLabel = new Date(`${to}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${fromLabel} – ${toLabel}`;
}
