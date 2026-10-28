'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, SelectField, Spinner } from '@/components/ui';
import { formatApiError } from '@/lib/api/errors';
import { useToast } from '@/lib/toast';
import type { PlatformBusiness } from '@/lib/api/types';
import {
  useAdminRenewSubscription,
  useExtendBusinessAccess,
  useUpdateBusinessCustomMonthlyPrice,
} from '@/lib/hooks/mutations';
import { usePlatformSubscriptionRenewals } from '@/lib/hooks/queries';

const DURATIONS = [1, 3, 6, 9, 12] as const;

function formatMoney(amount: number, currency = 'PKR') {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function RenewSubscriptionPanel({ business }: { business: PlatformBusiness }) {
  const toast = useToast();
  const renew = useAdminRenewSubscription();
  const extendAccess = useExtendBusinessAccess();
  const updateCustomPrice = useUpdateBusinessCustomMonthlyPrice();
  const { data: renewals = [], isLoading: renewalsLoading } = usePlatformSubscriptionRenewals(
    business.id,
  );

  const idempotencyRef = useRef<string>(crypto.randomUUID());
  const monthly = business.effectiveMonthlyPrice ?? 0;
  const currency = 'PKR';

  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED' | ''>('');
  const [discountValue, setDiscountValue] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [note, setNote] = useState('');
  const [sendInvoice, setSendInvoice] = useState(true);
  const [extendDays, setExtendDays] = useState('7');
  const [customMonthlyDraft, setCustomMonthlyDraft] = useState(
    business.customMonthlyPrice != null ? String(business.customMonthlyPrice) : '',
  );

  useEffect(() => {
    setCustomMonthlyDraft(
      business.customMonthlyPrice != null ? String(business.customMonthlyPrice) : '',
    );
  }, [business.id, business.customMonthlyPrice]);

  const computedBase = Math.round(monthly * durationMonths * 100) / 100;
  const computedFinal = useMemo(() => {
    if (overrideAmount.trim()) {
      const n = Number(overrideAmount);
      return Number.isFinite(n) ? n : computedBase;
    }
    if (discountType && discountValue.trim()) {
      const dv = Number(discountValue);
      if (!Number.isFinite(dv) || dv <= 0) return computedBase;
      if (discountType === 'PERCENT') {
        return Math.round(computedBase * (1 - Math.min(100, dv) / 100) * 100) / 100;
      }
      return Math.max(0, Math.round((computedBase - dv) * 100) / 100);
    }
    return computedBase;
  }, [computedBase, discountType, discountValue, overrideAmount]);

  async function handleRenew() {
    try {
      await renew.mutateAsync({
        businessId: business.id,
        durationMonths,
        discountType: discountType || undefined,
        discountValue: discountValue ? Number(discountValue) : undefined,
        overrideFinalAmount: overrideAmount ? Number(overrideAmount) : undefined,
        finalAmount: computedFinal,
        paymentReference: paymentReference.trim() || undefined,
        note: note.trim() || undefined,
        sendInvoice,
        idempotencyKey: idempotencyRef.current,
      });
      toast.success('Subscription renewed');
      idempotencyRef.current = crypto.randomUUID();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleExtendAccess() {
    try {
      await extendAccess.mutateAsync({
        id: business.id,
        days: Number(extendDays) || 7,
      });
      toast.success('Access extended');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function saveCustomMonthly() {
    try {
      const value = customMonthlyDraft.trim();
      await updateCustomPrice.mutateAsync({
        id: business.id,
        customMonthlyPrice: value === '' ? null : Number(value),
      });
      toast.success('Custom monthly price saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <div className="rounded-xl border border-outline-variant/20 p-4 space-y-6">
      <div>
        <p className="font-body-emphasis text-primary">Renew subscription</p>
        <p className="font-caption text-on-surface-variant">
          Effective monthly: {formatMoney(monthly, currency)} · phase:{' '}
          {business.accessPhase ?? '—'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          label="Custom monthly price (blank = global)"
          type="number"
          min={0}
          value={customMonthlyDraft}
          onChange={(e) => setCustomMonthlyDraft(e.target.value)}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            loading={updateCustomPrice.isPending}
            onClick={saveCustomMonthly}
            className="w-full"
          >
            Save custom price
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <SelectField
          label="Duration (months)"
          value={String(durationMonths)}
          onChange={(e) => setDurationMonths(Number(e.target.value))}
          options={DURATIONS.map((m) => ({ value: String(m), label: `${m} month${m > 1 ? 's' : ''}` }))}
        />
        <SelectField
          label="Discount type"
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
          options={[
            { value: '', label: 'None' },
            { value: 'PERCENT', label: 'Percent' },
            { value: 'FIXED', label: 'Fixed amount' },
          ]}
        />
        <Input
          label="Discount value"
          type="number"
          min={0}
          disabled={!discountType}
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          label="Override final amount (optional)"
          type="number"
          min={0}
          value={overrideAmount}
          onChange={(e) => setOverrideAmount(e.target.value)}
        />
        <Input
          label="Payment reference"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
        />
      </div>

      <Input label="Internal note" value={note} onChange={(e) => setNote(e.target.value)} />

      <p className="font-body-emphasis text-primary">
        Total: {formatMoney(computedFinal, currency)}{' '}
        <span className="font-caption text-on-surface-variant">
          (list {formatMoney(computedBase, currency)})
        </span>
      </p>

      <label className="flex items-center gap-2 font-caption cursor-pointer">
        <input
          type="checkbox"
          checked={sendInvoice}
          onChange={(e) => setSendInvoice(e.target.checked)}
          className="rounded border-outline-variant"
        />
        Send purchase invoice to tenant after renew
      </label>

      <Button
        type="button"
        variant="primary"
        loading={renew.isPending}
        onClick={handleRenew}
        className="w-full sm:w-auto"
      >
        Renew subscription
      </Button>

      <div className="border-t border-outline-variant/20 pt-4 flex flex-wrap gap-3 items-end">
        <Input
          label="Extend access (days)"
          type="number"
          min={1}
          max={365}
          value={extendDays}
          onChange={(e) => setExtendDays(e.target.value)}
          className="flex-1 min-w-[140px]"
        />
        <Button
          type="button"
          variant="secondary"
          loading={extendAccess.isPending}
          onClick={handleExtendAccess}
        >
          Extend access
        </Button>
      </div>

      <div>
        <p className="font-body-emphasis text-primary mb-2">Renewal history</p>
        {renewalsLoading && <Spinner className="h-5 w-5" />}
        {!renewalsLoading && renewals.length === 0 && (
          <p className="font-caption text-on-surface-variant">No renewals recorded yet.</p>
        )}
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {renewals.map((r) => (
            <li
              key={r.id}
              className="font-caption text-on-surface-variant border border-outline-variant/15 rounded-lg px-3 py-2"
            >
              {new Date(r.createdAt).toLocaleString()} · {r.source} · {r.durationMonths} mo ·{' '}
              {formatMoney(Number(r.finalAmount), r.currency)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
