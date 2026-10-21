'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import {
  buildCompleteOrderPaymentPayload,
  type CompleteOrderPaymentPayload,
  type PaymentMethod,
} from '@/lib/payment-methods';

type PayMethod = 'CASH' | 'CARD' | 'ONLINE';

export function CashierTerminalPaymentModal({
  open,
  onClose,
  orderLabel,
  orderContext,
  totalAmount,
  loading,
  success,
  onConfirm,
  onFinish,
}: {
  open: boolean;
  onClose: () => void;
  orderLabel: string;
  orderContext: string;
  totalAmount: number;
  loading?: boolean;
  success?: {
    method: PayMethod;
    tendered: number;
    change: number;
  } | null;
  onConfirm: (payload: CompleteOrderPaymentPayload) => void;
  onFinish: () => void;
}) {
  const formatMoney = useFormatMoney();
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  useEffect(() => {
    if (!open) return;
    setMethod('CASH');
    setCashReceived(String(Math.ceil(totalAmount)));
    setReferenceNumber('');
  }, [open, totalAmount]);

  const cashReceivedNum = Number(cashReceived) || 0;
  const change = useMemo(
    () => Math.max(0, Math.round((cashReceivedNum - totalAmount) * 100) / 100),
    [cashReceivedNum, totalAmount],
  );

  if (!open) return null;

  function handleComplete() {
    const paymentMethod: PaymentMethod = method === 'ONLINE' ? 'ONLINE' : method;
    const payload = buildCompleteOrderPaymentPayload(
      [
        {
          method: paymentMethod,
          amount: totalAmount,
          amountReceived: method === 'CASH' ? cashReceivedNum : undefined,
          referenceNumber: method !== 'CASH' && referenceNumber.trim() ? referenceNumber.trim() : undefined,
        },
      ],
      totalAmount,
    );
    onConfirm(payload);
  }

  function handleClose() {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      {success ? (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Icon name="check" className="text-4xl" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">Payment complete</h3>
          <p className="text-sm text-slate-500 mt-1">
            {formatMoney(totalAmount)} received for {orderLabel}
          </p>
          <div className="p-4 my-6 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Method</span>
              <span className="font-bold text-slate-900">
                {success.method === 'CASH' ? 'Cash' : success.method === 'CARD' ? 'Card' : 'Online / QR'}
              </span>
            </div>
            {success.method === 'CASH' && (
              <>
                <div className="flex justify-between">
                  <span>Tendered</span>
                  <span className="font-bold text-slate-900">{formatMoney(success.tendered)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Change returned</span>
                  <span className="text-emerald-700">{formatMoney(success.change)}</span>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm"
          >
            + New order
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Payment</h3>
              <p className="text-sm text-slate-500">{orderLabel} · {orderContext}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>

          <div className="my-4 p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Total amount due</span>
            <span className="text-3xl font-black text-emerald-400">{formatMoney(totalAmount)}</span>
          </div>

          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Payment method
          </label>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {(
              [
                { id: 'CASH' as const, icon: 'payments', label: 'CASH' },
                { id: 'CARD' as const, icon: 'credit_card', label: 'CARD' },
                { id: 'ONLINE' as const, icon: 'qr_code_scanner', label: 'ONLINE / QR' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMethod(option.id)}
                className={`p-3 rounded-xl font-extrabold text-sm text-slate-900 flex flex-col items-center gap-1 ${
                  method === option.id
                    ? 'border-2 border-emerald-600 bg-emerald-50/60'
                    : 'border border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <Icon
                  name={option.icon}
                  className={`text-2xl ${method === option.id ? 'text-emerald-700' : 'text-slate-600'}`}
                />
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          {method === 'CASH' && (
            <div className="mb-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Cash received
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xl font-extrabold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setCashReceived(String(totalAmount))}
                  className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
                >
                  Exact
                </button>
                {[3000, 4000, 5000]
                  .filter((n) => n >= totalAmount)
                  .slice(0, 3)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCashReceived(String(n))}
                      className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
                    >
                      {formatMoney(n)}
                    </button>
                  ))}
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <span className="text-sm font-bold text-amber-900">Return cash change</span>
                <span className="text-2xl font-black text-amber-900">{formatMoney(change)}</span>
              </div>
            </div>
          )}

          {method !== 'CASH' && (
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Reference (optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction or transfer reference"
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          )}

          <button
            type="button"
            disabled={loading || (method === 'CASH' && cashReceivedNum < totalAmount - 0.001)}
            onClick={handleComplete}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all"
          >
            <Icon name="check_circle" className="text-2xl" />
            <span>{loading ? 'Processing…' : 'COMPLETE PAYMENT'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
