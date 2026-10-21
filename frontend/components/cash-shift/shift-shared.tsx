'use client';

import { Icon } from '@/components/ui';
import type { CashDrawerMovement } from '@/lib/api/types';

export function movementLabel(type: string) {
  switch (type) {
    case 'OPENING':
      return 'Opening float';
    case 'SALE':
      return 'Cash sale';
    case 'REFUND':
      return 'Cash refund';
    case 'PAY_IN':
      return 'Cash added';
    case 'PAY_OUT':
      return 'Cash removed';
    case 'CLOSING':
      return 'Closing count';
    default:
      return type;
  }
}

export function movementIcon(type: string): string {
  switch (type) {
    case 'OPENING':
      return 'account_balance_wallet';
    case 'SALE':
      return 'payments';
    case 'REFUND':
      return 'undo';
    case 'PAY_IN':
      return 'add_circle';
    case 'PAY_OUT':
      return 'remove_circle';
    case 'CLOSING':
      return 'lock';
    default:
      return 'swap_horiz';
  }
}

export function isDebitMovement(type: string) {
  return type === 'PAY_OUT' || type === 'REFUND';
}

export function formatVariance(
  variance: string | number | null | undefined,
  formatMoney: (v: number | string | null | undefined) => string,
) {
  const value = Number(variance ?? 0);
  if (value === 0) {
    return { label: 'Balanced', className: 'bg-surface-container-high text-on-surface-variant' };
  }
  if (value > 0) {
    return { label: `Over ${formatMoney(value)}`, className: 'bg-primary-container text-on-primary-container' };
  }
  return {
    label: `Short ${formatMoney(Math.abs(value))}`,
    className: 'bg-error-container text-on-error-container',
  };
}

export function shiftDurationLabel(openedAt: string) {
  const ms = Date.now() - new Date(openedAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ShiftMetricCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 md:p-5 transition-colors ${
        highlight
          ? 'border-primary/25 bg-gradient-to-br from-primary-container/40 to-surface-container-lowest'
          : 'border-outline-variant/15 bg-surface-container-lowest card-hairline'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-caption text-on-surface-variant uppercase tracking-wider text-[10px]">
            {label}
          </p>
          <p className="font-display-md text-primary mt-1.5 tabular-nums truncate">{value}</p>
          {sub && <p className="font-caption text-on-surface-variant mt-1">{sub}</p>}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            highlight ? 'bg-primary/15 text-primary' : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <Icon name={icon} className="text-xl" />
        </div>
      </div>
    </div>
  );
}

export function MovementFeed({
  movements,
  formatMoney,
  loading,
  emptyMessage = 'No drawer activity yet.',
}: {
  movements: CashDrawerMovement[];
  formatMoney: (v: number | string | null | undefined) => string;
  loading?: boolean;
  emptyMessage?: string;
}) {
  if (loading) {
    return <p className="font-caption text-on-surface-variant py-6 text-center">Loading activity…</p>;
  }

  if (!movements.length) {
    return <p className="font-caption text-on-surface-variant py-6 text-center">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-0">
      {movements.map((movement, index) => {
        const debit = isDebitMovement(movement.type);
        return (
          <li key={movement.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < movements.length - 1 && (
              <span
                className="absolute left-[15px] top-8 bottom-0 w-px bg-outline-variant/25"
                aria-hidden
              />
            )}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                debit ? 'bg-error-container/60 text-on-error-container' : 'bg-primary-container/70 text-primary'
              }`}
            >
              <Icon name={movementIcon(movement.type)} className="text-base" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-body-emphasis text-on-surface">{movementLabel(movement.type)}</p>
                <span
                  className={`font-mono text-sm shrink-0 tabular-nums ${
                    debit ? 'text-error' : 'text-primary'
                  }`}
                >
                  {debit ? '−' : '+'}
                  {formatMoney(movement.amount)}
                </span>
              </div>
              <p className="font-caption text-on-surface-variant mt-0.5 line-clamp-2">
                {movement.reason || movement.createdByName}
              </p>
              <p className="font-caption text-on-surface-variant/80 mt-0.5">
                {new Date(movement.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
