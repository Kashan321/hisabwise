'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import {
  PAYMENT_METHODS,
  buildCompleteOrderPaymentPayload,
  type CompleteOrderPaymentPayload,
  type OrderPaymentLine,
  type PaymentMethod,
} from '@/lib/payment-methods';

const QUICK_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER'];

type SplitRow = { method: PaymentMethod; amount: string };

function parseMoney(value: string): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '.') return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function cashLine(totalAmount: number, tenderedStr: string): OrderPaymentLine {
  const amount = totalAmount;
  const received = parseMoney(tenderedStr) || amount;
  const change = Math.max(0, Math.round((received - amount) * 100) / 100);
  return {
    method: 'CASH',
    amount,
    amountReceived: received,
    changeGiven: change > 0 ? change : undefined,
  };
}

function splitRowToLine(row: SplitRow): OrderPaymentLine | null {
  const amount = parseMoney(row.amount);
  if (amount <= 0) return null;
  if (row.method === 'CASH') {
    return { method: 'CASH', amount, amountReceived: amount };
  }
  return { method: row.method, amount };
}

export function CompleteOrderPaymentModal({
  open,
  onClose,
  orderLabel,
  totalAmount,
  loading,
  onConfirm,
  cashOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  orderLabel: string;
  totalAmount: number;
  loading?: boolean;
  onConfirm: (payload: CompleteOrderPaymentPayload) => void;
  /** Offline POS: restrict to manual cash entry. */
  cashOnly?: boolean;
}) {
  const formatMoney = useFormatMoney();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [reference, setReference] = useState('');
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitA, setSplitA] = useState<SplitRow>({ method: 'CASH', amount: '' });
  const [splitB, setSplitB] = useState<SplitRow>({ method: 'CARD', amount: '' });

  useEffect(() => {
    if (!open) return;
    setMethod(cashOnly ? 'CASH' : 'CASH');
    setCashTendered(totalAmount > 0 ? String(totalAmount) : '');
    setReference('');
    setSplitOpen(false);
    setSplitA({ method: 'CASH', amount: '' });
    setSplitB({ method: 'CARD', amount: '' });
  }, [open, totalAmount, cashOnly]);

  const cashPaid = useMemo(() => parseMoney(cashTendered), [cashTendered]);

  const change = useMemo(
    () => Math.max(0, Math.round((cashPaid - totalAmount) * 100) / 100),
    [cashPaid, totalAmount],
  );

  const stillNeedFromCustomer = useMemo(
    () => Math.max(0, Math.round((totalAmount - cashPaid) * 100) / 100),
    [cashPaid, totalAmount],
  );

  const cashIsShort =
    !splitOpen && method === 'CASH' && totalAmount > 0 && cashPaid > 0 && stillNeedFromCustomer > 0.001;

  const splitPaid = useMemo(
    () => parseMoney(splitA.amount) + parseMoney(splitB.amount),
    [splitA.amount, splitB.amount],
  );
  const splitRemaining = Math.max(0, Math.round((totalAmount - splitPaid) * 100) / 100);
  const splitOk = splitOpen && splitRemaining < 0.01;

  function openSplitPayment() {
    if (method === 'CASH' && cashPaid > 0) {
      const cashPart = Math.min(cashPaid, totalAmount);
      const rest = Math.max(0, Math.round((totalAmount - cashPart) * 100) / 100);
      setSplitA({ method: 'CASH', amount: String(cashPart) });
      setSplitB({ method: 'CARD', amount: rest > 0 ? String(rest) : '' });
    } else {
      const half = Math.round((totalAmount / 2) * 100) / 100;
      const other = Math.round((totalAmount - half) * 100) / 100;
      setSplitA({
        method: method === 'CASH' ? 'CASH' : method,
        amount: totalAmount > 0 ? String(half) : '',
      });
      setSplitB({
        method: method === 'CASH' ? 'CARD' : 'CASH',
        amount: totalAmount > 0 ? String(other) : '',
      });
    }
    setSplitOpen(true);
  }

  function backToSinglePayment() {
    const cashRow = splitA.method === 'CASH' ? splitA : splitB.method === 'CASH' ? splitB : null;
    if (cashRow && parseMoney(cashRow.amount) > 0) {
      setMethod('CASH');
      setCashTendered(cashRow.amount);
    } else {
      setMethod(splitA.method);
    }
    setSplitOpen(false);
  }

  function buildPayments(): OrderPaymentLine[] {
    if (splitOpen) {
      return [splitRowToLine(splitA), splitRowToLine(splitB)].filter(
        (line): line is OrderPaymentLine => line != null,
      );
    }
    if (method === 'CASH') {
      return [cashLine(totalAmount, cashTendered)];
    }
    return [{ method, amount: totalAmount, referenceNumber: reference.trim() || undefined }];
  }

  function handleConfirm() {
    onConfirm(buildCompleteOrderPaymentPayload(buildPayments(), totalAmount));
  }

  const canComplete = splitOpen
    ? splitOk && buildPayments().some((l) => l.amount > 0)
    : method === 'CASH'
      ? cashPaid >= totalAmount - 0.001 || totalAmount === 0
      : totalAmount > 0;

  const inputClass =
    'w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-3 font-mono text-lg tabular-nums';

  function renderSplitRow(
    label: string,
    row: SplitRow,
    setRow: (patch: Partial<SplitRow>) => void,
  ) {
    return (
      <div className="rounded-xl border border-outline-variant/25 p-4 space-y-3 bg-surface-container-lowest">
        <p className="font-caption font-bold uppercase tracking-wide text-on-surface-variant">
          {label}
        </p>
        <label className="block space-y-1.5">
          <span className="font-caption text-on-surface-variant">Payment method</span>
          <select
            value={row.method}
            disabled={loading}
            onChange={(e) => setRow({ method: e.target.value as PaymentMethod })}
            className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 font-body"
          >
            {PAYMENT_METHODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="font-body-emphasis">Amount for this payment</span>
          <input
            type="text"
            inputMode="decimal"
            disabled={loading}
            value={row.amount}
            onChange={(e) => setRow({ amount: e.target.value })}
            placeholder="0"
            className={inputClass}
          />
        </label>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Take payment"
      description={orderLabel}
      size="md"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            disabled={!canComplete}
            onClick={handleConfirm}
            title={
              cashIsShort
                ? `Collect ${stillNeedFromCustomer} more before completing`
                : splitOpen && !splitOk
                  ? `Split payments need ${splitRemaining} more`
                  : undefined
            }
          >
            {cashIsShort
              ? `Need ${formatMoney(stillNeedFromCustomer)} more`
              : splitOpen && !splitOk
                ? `Need ${formatMoney(splitRemaining)} more`
                : `Done · ${formatMoney(totalAmount)}`}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-center font-mono text-3xl sm:text-4xl font-bold text-primary tabular-nums">
          {formatMoney(totalAmount)}
        </p>

        {!splitOpen ? (
          <>
            {cashOnly ? (
              <p className="text-center font-caption text-on-surface-variant">
                Offline mode — cash payments only. This sale will sync when you are back online.
              </p>
            ) : null}
            {!cashOnly ? (
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_METHODS.map((m) => {
                const pillLabel = PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m;
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={loading}
                    onClick={() => setMethod(m)}
                    className={`rounded-full px-5 py-2.5 font-body-emphasis transition-colors ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {pillLabel}
                  </button>
                );
              })}
              <select
                value={QUICK_METHODS.includes(method) ? '' : method}
                disabled={loading}
                onChange={(e) => {
                  const v = e.target.value as PaymentMethod;
                  if (v) setMethod(v);
                }}
                className={`rounded-full px-4 py-2.5 font-caption border ${
                  !QUICK_METHODS.includes(method)
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant/30 bg-surface text-on-surface-variant'
                }`}
              >
                <option value="">Other…</option>
                {PAYMENT_METHODS.filter((p) => !QUICK_METHODS.includes(p.value)).map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            ) : null}

            {method === 'CASH' ? (
              <div className="space-y-3">
                <label className="block space-y-2">
                  <span className="font-body-emphasis">Customer paid</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    disabled={loading}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className={`${inputClass} ${
                      cashIsShort ? 'border-error ring-1 ring-error/30' : ''
                    }`}
                  />
                </label>

                {cashIsShort ? (
                  <div
                    className="rounded-xl border border-error/40 bg-error-container/50 px-4 py-3 space-y-1"
                    role="status"
                  >
                    <p className="font-body-emphasis text-on-error-container">
                      Still need {formatMoney(stillNeedFromCustomer)} from customer
                    </p>
                    <p className="font-caption text-on-error-container/90">
                      Bill {formatMoney(totalAmount)} · received {formatMoney(cashPaid)}
                    </p>
                  </div>
                ) : cashPaid >= totalAmount - 0.001 && totalAmount > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3">
                    <span className="text-on-surface-variant">
                      {change > 0 ? 'Change to give back' : 'Exact payment'}
                    </span>
                    <span className="font-mono text-2xl font-bold text-primary tabular-nums">
                      {change > 0 ? formatMoney(change) : '—'}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <label className="block space-y-2">
                <span className="font-caption text-on-surface-variant">Reference (optional)</span>
                <input
                  type="text"
                  maxLength={64}
                  disabled={loading}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Receipt or approval code"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2.5 font-caption"
                />
              </label>
            )}

            <button
              type="button"
              onClick={openSplitPayment}
              className="w-full text-center font-caption text-on-surface-variant hover:text-primary"
            >
              Customer pays two ways (split)
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div
              className={`rounded-xl px-4 py-3 text-center font-caption ${
                splitOk
                  ? 'bg-primary-container/50 text-on-primary-container'
                  : 'bg-error-container/40 text-on-error-container'
              }`}
              role="status"
            >
              {splitOk ? (
                <>Payments add up to {formatMoney(totalAmount)}</>
              ) : (
                <>
                  Need {formatMoney(splitRemaining)} more · recorded {formatMoney(splitPaid)} of{' '}
                  {formatMoney(totalAmount)}
                </>
              )}
            </div>

            {renderSplitRow('First payment', splitA, (patch) =>
              setSplitA((s) => ({ ...s, ...patch })),
            )}
            {renderSplitRow('Second payment', splitB, (patch) =>
              setSplitB((s) => ({ ...s, ...patch })),
            )}

            <button
              type="button"
              onClick={backToSinglePayment}
              className="w-full text-center font-caption text-primary hover:underline"
            >
              Back to single payment
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
