/** Supplier expenses print — used when `SUPPLIER_EXPENSES_ENABLED` is true. */
import type { SupplierAccount, SupplierLedgerEntry } from '@/lib/api/types';
import { printThermalDocument } from '@/lib/print-thermal-document';

function balanceStatusText(balanceDue: string, formatMoney: (v: number | string) => string): string {
  const n = Number(balanceDue);
  if (Number.isNaN(n) || Math.abs(n) < 0.005) return 'Settled';
  if (n > 0) return `Owes ${formatMoney(n)}`;
  return `Prepaid ${formatMoney(Math.abs(n))}`;
}

export function printSupplierLedgerReport(input: {
  supplier: SupplierAccount;
  ledger: SupplierLedgerEntry[];
  businessName?: string;
  businessLocation?: string | null;
  formatMoney: (value: number | string | null | undefined) => string;
  widthMm?: 58 | 80;
}) {
  const { supplier, ledger, businessName, businessLocation, formatMoney, widthMm } = input;

  printThermalDocument({
    title: 'Supplier account report',
    subtitle: supplier.name,
    businessName,
    businessLocation,
    widthMm,
    stats: [
      ...(supplier.phone ? [{ label: 'Phone', value: supplier.phone }] : []),
      ...(supplier.email ? [{ label: 'Email', value: supplier.email }] : []),
      { label: 'Opening balance owed', value: formatMoney(supplier.openingBalanceOwed) },
      { label: 'Total purchased', value: formatMoney(supplier.totalPurchased) },
      { label: 'Total paid', value: formatMoney(supplier.totalPaid) },
      { label: 'Balance', value: balanceStatusText(supplier.balanceDue, formatMoney) },
      { label: 'Purchases', value: String(supplier.purchaseCount) },
      { label: 'Payments', value: String(supplier.paymentCount) },
    ],
    tables: ledger.length
      ? (() => {
          const maxRows = 80;
          const visible = ledger.slice(0, maxRows);
          const truncatedCount =
            ledger.length > maxRows ? ledger.length - maxRows : undefined;
          return [
            {
              heading: 'History',
              headers: ['Details', 'Amount'],
              rows: visible.map((row) => {
                const d = new Date(row.date);
                const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
                const time = d.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const refLine = row.reference ? `\nRef: ${row.reference}` : '';
                const desc =
                  row.type === 'PURCHASE'
                    ? `Purchase: ${row.label}${refLine}`
                    : `${row.label}${refLine}`;
                const sign = row.direction === 'debit' ? '+' : '-';
                const left = `${date} ${time}\n${desc}`;
                return [left, `${sign}${formatMoney(row.amount)}`];
              }),
              truncatedCount,
            },
          ];
        })()
      : undefined,
    footerLines: ['End of supplier report'],
  });
}
