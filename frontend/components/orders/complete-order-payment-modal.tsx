'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  buildCompleteOrderPaymentPayload,
  derivePaymentStatus,
  type CompleteOrderPaymentPayload,
  type OrderPaymentLine,
  type PaymentMethod,
} from '@/lib/payment-methods';

function emptyLine(amount: number, method: PaymentMethod = 'CASH'): OrderPaymentLine {
  return { method, amount, amountReceived: method === 'CASH' ? amount : undefined };
}

export function CompleteOrderPaymentModal({
  open,
  onClose,
  orderLabel,
  totalAmount,
  loading,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  orderLabel: string;
  totalAmount: number;
  loading?: boolean;
  onConfirm: (payload: CompleteOrderPaymentPayload) => void;
}) {
  const formatMoney = useFormatMoney();
  const [lines, setLines] = useState<OrderPaymentLine[]>([emptyLine(totalAmount)]);

  useEffect(() => {
    if (open) setLines([emptyLine(totalAmount)]);
  }, [open, totalAmount]);

  const paidTotal = useMemo(
    () => Math.round(lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0) * 100) / 100,
    [lines],
  );
  const remaining = Math.max(0, Math.round((totalAmount - paidTotal) * 100) / 100);
  const paymentStatus = derivePaymentStatus(lines, totalAmount);
  const cashLine = lines.find((line) => line.method === 'CASH');
  const cashReceived = cashLine?.amountReceived ?? cashLine?.amount ?? 0;
  const cashChange =
    cashLine && cashReceived > cashLine.amount
      ? Math.round((cashReceived - cashLine.amount) * 100) / 100
      : 0;

  function updateLine(index: number, patch: Partial<OrderPaymentLine>) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.method && patch.method !== 'CASH') {
          next.amountReceived = undefined;
          next.changeGiven = undefined;
        }
        if (patch.method === 'CASH' && next.amountReceived == null) {
          next.amountReceived = next.amount;
        }
        return next;
      }),
    );
  }

  function addSplitLine() {
    setLines((prev) => [...prev, emptyLine(remaining > 0 ? remaining : 0, 'CARD')]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleConfirm() {
    onConfirm(buildCompleteOrderPaymentPayload(lines, totalAmount));
  }

  const canComplete = lines.some((line) => line.amount > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete order"
      description={`Collect payment for ${orderLabel}`}
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
          >
            Complete · {formatMoney(totalAmount)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-surface-container-low/60 px-4 py-3">
          <div>
            <p className="font-caption text-on-surface-variant uppercase tracking-wider">Order total</p>
            <p className="font-mono text-2xl font-bold text-primary tabular-nums">
              {formatMoney(totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-caption text-on-surface-variant uppercase tracking-wider">Status</p>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full font-caption font-bold uppercase tracking-wide ${
                paymentStatus === 'PAID'
                  ? 'bg-primary-container text-on-primary-container'
                  : paymentStatus === 'PARTIAL'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : paymentStatus === 'FAILED'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {PAYMENT_STATUS_LABELS[paymentStatus]}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-caption text-on-surface-variant uppercase tracking-wider">Payments</p>
            <button
              type="button"
              onClick={addSplitLine}
              className="font-caption text-primary hover:underline flex items-center gap-1"
            >
              <Icon name="add" className="text-sm" />
              Split payment
            </button>
          </div>

          {lines.map((line, index) => (
            <div
              key={index}
              className="rounded-xl border border-outline-variant/25 p-3 space-y-3 bg-surface-container-lowest"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="col-span-2 sm:col-span-1 space-y-1">
                    <span className="font-caption text-on-surface-variant">Method</span>
                    <select
                      value={line.method}
                      disabled={loading}
                      onChange={(e) => updateLine(index, { method: e.target.value as PaymentMethod })}
                      className="w-full rounded-lg border border-outline-variant/30 bg-surface px-2 py-2 font-caption"
                    >
                      {PAYMENT_METHODS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="font-caption text-on-surface-variant">Amount</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={loading}
                      value={line.amount}
                      onChange={(e) =>
                        updateLine(index, { amount: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-outline-variant/30 bg-surface px-2 py-2 font-caption font-mono"
                    />
                  </label>
                  {lines.length > 1 && (
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="p-2 text-on-surface-variant hover:text-error"
                        aria-label="Remove payment"
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {line.method === 'CASH' && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/15">
                  <label className="space-y-1">
                    <span className="font-caption text-on-surface-variant">Amount received</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={loading}
                      value={line.amountReceived ?? line.amount}
                      onChange={(e) =>
                        updateLine(index, { amountReceived: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-outline-variant/30 bg-surface px-2 py-2 font-caption font-mono"
                    />
                  </label>
                  <div className="space-y-1">
                    <span className="font-caption text-on-surface-variant">Change to return</span>
                    <p className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-2 py-2 font-caption font-mono text-primary">
                      {formatMoney(
                        Math.max(
                          0,
                          Math.round(
                            ((line.amountReceived ?? line.amount) - line.amount) * 100,
                          ) / 100,
                        ),
                      )}
                    </p>
                  </div>
                </div>
              )}

              {(line.method === 'CARD' || line.method === 'BANK_TRANSFER') && (
                <label className="block space-y-1 pt-1 border-t border-outline-variant/15">
                  <span className="font-caption text-on-surface-variant">
                    {line.method === 'CARD' ? 'Card transaction / reference' : 'Transfer reference'}
                  </span>
                  <input
                    type="text"
                    maxLength={64}
                    disabled={loading}
                    value={line.referenceNumber ?? ''}
                    onChange={(e) => updateLine(index, { referenceNumber: e.target.value })}
                    placeholder="Optional reference number"
                    className="w-full rounded-lg border border-outline-variant/30 bg-surface px-2 py-2 font-caption"
                  />
                </label>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-outline-variant/20 divide-y divide-outline-variant/15">
          <div className="flex justify-between px-4 py-2 font-caption">
            <span className="text-on-surface-variant">Paid</span>
            <span className="font-mono text-on-surface">{formatMoney(paidTotal)}</span>
          </div>
          <div className="flex justify-between px-4 py-2 font-caption">
            <span className="text-on-surface-variant">Remaining</span>
            <span className={`font-mono ${remaining > 0 ? 'text-secondary' : 'text-primary'}`}>
              {formatMoney(remaining)}
            </span>
          </div>
          {cashLine && cashChange > 0 && (
            <div className="flex justify-between px-4 py-2 font-caption">
              <span className="text-on-surface-variant">Change due</span>
              <span className="font-mono text-primary">{formatMoney(cashChange)}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
