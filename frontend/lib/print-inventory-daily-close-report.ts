import type { InventoryDailySessionSummary } from '@/lib/api/types';
import { printThermalDocument } from '@/lib/print-thermal-document';

export function printInventoryDailyCloseReport(input: {
  summary: InventoryDailySessionSummary;
  businessName?: string;
  businessLocation?: string | null;
  formatMoney: (value: number | string | null | undefined) => string;
  widthMm?: 58 | 80;
}) {
  const { summary, businessName, businessLocation, formatMoney, widthMm } = input;
  const { session, totals, purchases } = summary;

  const dateLabel = new Date(`${session.sessionDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const shiftLabel = session.shiftName ? ` · ${session.shiftName}` : '';

  printThermalDocument({
    title: 'Daily inventory report',
    subtitle: `${dateLabel}${shiftLabel}`,
    businessName,
    businessLocation,
    widthMm,
    stats: [
      { label: 'Status', value: session.status === 'OPEN' ? 'Open' : 'Closed' },
      { label: 'Opened by', value: session.openedByName },
      ...(session.closedByName ? [{ label: 'Closed by', value: session.closedByName }] : []),
      { label: 'Money spent (purchases)', value: formatMoney(totals.totalPurchasesValue) },
      { label: 'Sales revenue', value: formatMoney(totals.totalSalesRevenue) },
      { label: 'Orders completed', value: totals.completedOrderCount },
      { label: 'Cost of sales (inventory)', value: formatMoney(totals.salesConsumptionValue) },
      { label: 'Wastage cost', value: formatMoney(totals.totalWastageValue) },
      { label: 'Total inventory out', value: formatMoney(totals.totalInventoryOutflow) },
      { label: 'Opening stock value', value: formatMoney(totals.openingStockValue) },
      { label: 'Closing stock value', value: formatMoney(totals.closingStockValue) },
      { label: 'Count variance value', value: formatMoney(totals.varianceValue) },
    ],
    tables: purchases.length
      ? [
          {
            heading: 'Purchases',
            headers: ['Item', 'Qty', 'Amount'],
            rows: purchases.map((p) => [
              p.itemName,
              p.quantity,
              p.totalCost ? formatMoney(p.totalCost) : '—',
            ]),
          },
        ]
      : undefined,
    footerLines: ['End of daily inventory report'],
  });
}
