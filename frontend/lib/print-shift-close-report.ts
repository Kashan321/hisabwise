import type { CashShift, CashShiftSummary } from '@/lib/api/types';
import { closingSettlementLabel } from '@/lib/cash-shift/closing-settlement';
import { printThermalDocument } from '@/lib/print-thermal-document';

export function printShiftCloseReport(input: {
  shift: CashShift;
  summary?: CashShiftSummary['summary'];
  businessName?: string;
  businessLocation?: string | null;
  formatMoney: (value: number | string | null | undefined) => string;
  widthMm?: 58 | 80;
}) {
  const { shift, summary, businessName, businessLocation, formatMoney, widthMm } = input;

  printThermalDocument({
    title: 'Shift closing report',
    businessName,
    businessLocation,
    widthMm,
    stats: [
      { label: 'Opened by', value: shift.openedByName },
      {
        label: 'Opened at',
        value: new Date(shift.openedAt).toLocaleString(),
      },
      ...(shift.closedAt
        ? [{ label: 'Closed at', value: new Date(shift.closedAt).toLocaleString() }]
        : []),
      { label: 'Opening float', value: formatMoney(shift.openingCash) },
      ...(summary
        ? [
            { label: 'Cash sales', value: formatMoney(summary.cashSales) },
            { label: 'Cash refunds', value: formatMoney(summary.cashRefunds) },
            { label: 'Pay in', value: formatMoney(summary.payIn) },
            { label: 'Pay out', value: formatMoney(summary.payOut) },
            { label: 'Expected cash', value: formatMoney(summary.expectedCash) },
          ]
        : []),
      { label: 'Actual counted', value: formatMoney(shift.actualCash) },
      { label: 'Variance', value: formatMoney(shift.variance) },
      ...(shift.closingSettlement
        ? [{ label: 'Settlement', value: closingSettlementLabel(shift.closingSettlement) }]
        : []),
      ...(shift.transferredCash != null
        ? [{ label: 'Cash transferred', value: formatMoney(shift.transferredCash) }]
        : []),
      ...(shift.destinationAccountName
        ? [{ label: 'Destination', value: shift.destinationAccountName }]
        : []),
      ...(shift.actualCash != null && shift.transferredCash != null
        ? [
            {
              label: 'Remaining in drawer',
              value: formatMoney(
                Math.max(0, Number(shift.actualCash) - Number(shift.transferredCash)),
              ),
            },
          ]
        : []),
    ],
    footerLines: ['End of shift report'],
  });
}
