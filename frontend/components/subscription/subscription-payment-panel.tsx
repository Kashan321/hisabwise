'use client';

import { useState } from 'react';
import { Button, Icon, Spinner } from '@/components/ui';
import { ImageUploadField } from '@/components/files/image-upload-field';
import { formatApiError } from '@/lib/api/errors';
import {
  useMyPaymentSubmissions,
  usePaymentInstructions,
  useSubscription,
} from '@/lib/hooks/queries';
import { useSubmitPayment } from '@/lib/hooks/mutations';
import { useToast } from '@/lib/toast';
import { PurchaseReceiptAlertActions } from '@/components/subscription/purchase-receipt-alert-actions';
import type { PaymentInstructions, TenantSubscription } from '@/lib/api/types';

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function PlanCard({
  label,
  price,
  currency,
  selected,
  onSelect,
}: {
  label: string;
  price: number;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
        selected
          ? 'border-primary bg-primary-container/30 ring-2 ring-primary'
          : 'border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/50'
      }`}
    >
      <p className="font-caption uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="font-display-md text-primary mt-1">{formatMoney(price, currency)}</p>
    </button>
  );
}

function BankDetails({ instructions }: { instructions: PaymentInstructions }) {
  const rows = [
    { label: 'Bank', value: instructions.bankName },
    { label: 'Account title', value: instructions.accountTitle },
    { label: 'Account number', value: instructions.accountNumber },
    { label: 'IBAN', value: instructions.iban },
    { label: 'SWIFT', value: instructions.swiftCode },
  ].filter((r) => r.value);

  if (!rows.length && !instructions.paymentInstructions) {
    return (
      <p className="font-caption text-on-surface-variant italic">
        Payment details are not configured yet. Please contact support.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4 text-sm">
          <span className="text-on-surface-variant shrink-0">{row.label}</span>
          <span className="font-mono text-primary text-right break-all">{row.value}</span>
        </div>
      ))}
      {instructions.paymentInstructions && (
        <p className="font-caption text-on-surface-variant pt-2 border-t border-outline-variant/20 whitespace-pre-wrap">
          {instructions.paymentInstructions}
        </p>
      )}
    </div>
  );
}

export function SubscriptionPaymentPanel({
  subscription,
  compact,
}: {
  subscription?: TenantSubscription;
  compact?: boolean;
}) {
  const toast = useToast();
  const { data: instructions, isLoading } = usePaymentInstructions();
  const { data: submissions = [] } = useMyPaymentSubmissions();
  const submitPayment = useSubmitPayment();
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const pending = submissions.find((s) => s.status === 'PENDING');
  const lastRejected = submissions.find((s) => s.status === 'REJECTED');

  if (isLoading || !instructions) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (pending || subscription?.hasPendingPayment) {
    return (
      <div className="rounded-xl border border-secondary/30 bg-secondary-container/20 p-6 space-y-3 text-center">
        <Icon name="hourglass_top" className="text-4xl text-secondary mx-auto" />
        <h2 className="font-title-lg text-primary">Payment pending review</h2>
        <p className="font-body-base text-on-surface-variant">
          Your payment proof was submitted. We will notify you once the admin approves your
          subscription.
        </p>
      </div>
    );
  }

  const selectedPlan =
    interval === 'MONTHLY' ? instructions.plans.monthly : instructions.plans.yearly;

  async function handleSubmit() {
    if (!proofUrl) {
      toast.error('Please upload a screenshot of your payment');
      return;
    }
    try {
      await submitPayment.mutateAsync({ interval, proofImageUrl: proofUrl });
      toast.success('Payment submitted for review');
      setProofUrl(null);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  const activeReceiptBanner = subscription?.purchaseReceipt;
  const purchaseInvoice = subscription?.latestPurchaseReceipt;

  return (
    <div className={`space-y-6 ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      {activeReceiptBanner && activeReceiptBanner.alertDaysRemaining > 0 && (
        <section className="rounded-xl border border-tertiary/30 bg-tertiary-container/20 p-5 space-y-3">
          <h2 className="font-title-lg text-primary flex items-center gap-2">
            <Icon name="campaign" />
            Dashboard reminder
          </h2>
          <p className="font-body-base text-on-surface-variant">
            {activeReceiptBanner.invoiceNumber} · paid — shown on every page until you hide it.
          </p>
          <PurchaseReceiptAlertActions receipt={activeReceiptBanner} />
        </section>
      )}

      {purchaseInvoice && subscription?.subscriptionStatus === 'ACTIVE' && (
        <section className="rounded-xl border border-tertiary/30 bg-tertiary-container/20 p-5 space-y-3">
          <h2 className="font-title-lg text-primary flex items-center gap-2">
            <Icon name="receipt_long" />
            Your subscription invoice
          </h2>
          <p className="font-body-base text-on-surface-variant">
            {purchaseInvoice.invoiceNumber} · paid{' '}
            {purchaseInvoice.periodEndsAt
              ? `· active until ${new Date(purchaseInvoice.periodEndsAt).toLocaleDateString()}`
              : ''}
          </p>
          <a href={purchaseInvoice.pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="secondary" className="cursor-pointer">
              <Icon name="picture_as_pdf" />
              Download PDF invoice
            </Button>
          </a>
        </section>
      )}

      {lastRejected && (
        <div className="rounded-xl border border-error/30 bg-error-container/20 p-4">
          <p className="font-body-emphasis text-error">Previous payment was rejected</p>
          {lastRejected.adminNote && (
            <p className="font-caption text-on-surface-variant mt-1">{lastRejected.adminNote}</p>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-title-lg text-primary">Choose a plan</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <PlanCard
            label="Monthly"
            price={instructions.plans.monthly.price}
            currency={instructions.plans.monthly.currency}
            selected={interval === 'MONTHLY'}
            onSelect={() => setInterval('MONTHLY')}
          />
          <PlanCard
            label="Yearly"
            price={instructions.plans.yearly.price}
            currency={instructions.plans.yearly.currency}
            selected={interval === 'YEARLY'}
            onSelect={() => setInterval('YEARLY')}
          />
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 space-y-4">
        <h2 className="font-title-lg text-primary flex items-center gap-2">
          <Icon name="account_balance" />
          Bank transfer details
        </h2>
        <BankDetails instructions={instructions} />
        <p className="font-caption text-on-surface-variant">
          Transfer {formatMoney(selectedPlan.price, selectedPlan.currency)} for the{' '}
          {interval === 'MONTHLY' ? 'monthly' : 'yearly'} plan, then upload your payment
          screenshot below.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-lg text-primary">Payment proof</h2>
        <ImageUploadField
          label="Upload payment screenshot"
          value={proofUrl}
          onChange={setProofUrl}
          folder="payment-proofs"
          hint="JPEG, PNG, or WebP — screenshot of your bank transfer"
          aspect="video"
          emptyIcon="receipt_long"
        />
      </section>

      <Button
        type="button"
        variant="primary"
        className="w-full cursor-pointer"
        disabled={submitPayment.isPending || !proofUrl}
        onClick={handleSubmit}
      >
        {submitPayment.isPending ? <Spinner className="h-5 w-5" /> : <Icon name="send" />}
        I have made the payment
      </Button>
    </div>
  );
}

export function SubscriptionStatusBanner({ subscription }: { subscription?: TenantSubscription }) {
  const { data: live } = useSubscription();
  const sub = subscription ?? live;
  if (!sub || sub.isLocked) return null;

  if (sub.subscriptionInvoice && sub.subscriptionInvoice.alertDaysRemaining > 0) {
    const inv = sub.subscriptionInvoice;
    return (
      <p className="font-caption text-on-surface-variant">
        Invoice {inv.invoiceNumber} — due in {inv.daysUntilDue} day{inv.daysUntilDue === 1 ? '' : 's'}
        {' · '}
        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
          PDF
        </a>
      </p>
    );
  }

  if (sub.status === 'TRIAL' && sub.trialEndsAt) {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    return (
      <p className="font-caption text-on-surface-variant">
        Free trial — {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining
      </p>
    );
  }

  if (sub.status === 'ACTIVE' && sub.subscriptionEndsAt) {
    return (
      <p className="font-caption text-on-surface-variant">
        Active until {new Date(sub.subscriptionEndsAt).toLocaleDateString()}
      </p>
    );
  }

  return null;
}
