'use client';

import { Icon } from '@/components/ui';
import type { InventoryDailySession, InventoryDailySessionSummary } from '@/lib/api/types';

function SummaryStatCard({
  icon,
  label,
  value,
  emphasize,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  emphasize?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name={icon} className="text-xl" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {label}
          </p>
          <p
            className={`mt-1 font-mono tabular-nums ${
              emphasize ? 'text-xl font-bold text-primary' : 'text-lg font-semibold text-on-surface'
            }`}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-on-surface-variant">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function InventoryDailyCloseSummary({
  session,
  totals,
  formatMoney,
}: {
  session: InventoryDailySession;
  totals: InventoryDailySessionSummary['totals'];
  formatMoney: (value: number | string | null | undefined) => string;
}) {
  const revenue = Number(totals.totalSalesRevenue);
  const cogs = Number(totals.salesConsumptionValue);
  const marginHint =
    revenue > 0 && cogs > 0
      ? `Gross margin ${formatMoney(revenue - cogs)} (sales − cost of sales)`
      : 'Enter unit costs on purchases to estimate inventory cost.';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-3 text-sm">
        <p className="font-semibold text-primary">
          {session.sessionDate}
          {session.shiftName ? ` · ${session.shiftName}` : ''}
        </p>
        <p className="mt-1 text-on-surface-variant">
          Opened by {session.openedByName}
          {session.closedByName ? ` · Closed by ${session.closedByName}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryStatCard
          icon="add_shopping_cart"
          label="Money spent on purchases"
          value={formatMoney(totals.totalPurchasesValue)}
          emphasize
        />
        <SummaryStatCard
          icon="payments"
          label="Sales revenue (session)"
          value={formatMoney(totals.totalSalesRevenue)}
          emphasize
          hint={`${totals.completedOrderCount} completed order(s)`}
        />
        <SummaryStatCard
          icon="restaurant"
          label="Cost of sales (inventory used)"
          value={formatMoney(totals.salesConsumptionValue)}
        />
        <SummaryStatCard
          icon="delete"
          label="Wastage cost"
          value={formatMoney(totals.totalWastageValue)}
        />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Total inventory out</p>
        <p className="mt-1 font-mono text-2xl font-bold text-primary tabular-nums">
          {formatMoney(totals.totalInventoryOutflow)}
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">{marginHint}</p>
      </div>
    </div>
  );
}
