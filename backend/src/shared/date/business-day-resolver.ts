/** Resolve logical business date from a timestamp and store cutoff settings. */
export function resolveBusinessDateKey(
  date: Date,
  businessDayStartTime: string,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const localDate = `${get('year')}-${get('month')}-${get('day')}`;
  const localMinutes = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);

  const [startH, startM] = businessDayStartTime.split(':').map((v) => parseInt(v, 10) || 0);
  const startMinutes = startH * 60 + startM;

  if (localMinutes < startMinutes) {
    const prev = new Date(`${localDate}T12:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    return prev.toISOString().slice(0, 10);
  }

  return localDate;
}

export function businessDateToUtcDate(businessDateKey: string): Date {
  return new Date(`${businessDateKey}T00:00:00.000Z`);
}

export function formatBusinessDateSuffix(businessDateKey: string): string {
  const [year, month, day] = businessDateKey.split('-');
  if (!year || !month || !day) return '';
  return `${year.slice(-2)}${month}${day}`;
}
