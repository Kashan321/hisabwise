import type { BusinessDay, BusinessDaySummary } from '@/lib/api/types';
import { printThermalDocument } from '@/lib/print-thermal-document';

export function printBusinessDayReport(input: {
  day: BusinessDay;
  summary: BusinessDaySummary;
  businessName?: string;
  businessLocation?: string | null;
  formatMoney: (value: number | string | null | undefined) => string;
  widthMm?: 58 | 80;
}) {
  const { day, summary, businessName, businessLocation, formatMoney, widthMm } = input;

  const dateLabel = new Date(`${day.businessDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  printThermalDocument({
    title: 'Business day report',
    subtitle: dateLabel,
    businessName,
    businessLocation,
    widthMm,
    stats: [
      { label: 'Status', value: day.status === 'OPEN' ? 'Open' : 'Closed' },
      {
        label: 'Started',
        value: new Date(day.startedAt).toLocaleString(),
      },
      ...(day.endedAt
        ? [{ label: 'Ended', value: new Date(day.endedAt).toLocaleString() }]
        : []),
      ...(day.openedByName ? [{ label: 'Opened by', value: day.openedByName }] : []),
      ...(day.closedByName ? [{ label: 'Closed by', value: day.closedByName }] : []),
      { label: 'Times opened', value: String(day.openCount ?? 1) },
      { label: 'Times closed', value: String(day.closeCount ?? 0) },
      { label: 'Total orders', value: String(summary.orderCount) },
      { label: 'Total sales', value: formatMoney(summary.totalSales) },
      { label: 'Shifts', value: String(summary.shifts.length) },
    ],
    tables: summary.shifts.length
      ? [
          {
            heading: 'Shift breakdown',
            headers: ['Shift', 'Orders', 'Sales'],
            rows: summary.shifts.map((shift, index) => [
              `#${index + 1} ${shift.openedByName}`,
              String(shift.orderCount),
              formatMoney(shift.sales),
            ]),
          },
        ]
      : undefined,
    footerLines: ['End of business day report'],
  });
}
