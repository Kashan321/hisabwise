'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { isInvoiceAlertDismissedLocally } from '@/lib/subscription-invoice-dismiss';
import { Button, Icon } from '@/components/ui';
import type { TenantSubscription } from '@/lib/api/types';
import {
  formatDaysRemaining,
  getSubscriptionDaysRemaining,
  getSubscriptionPeriodEnd,
  subscriptionStatusOf,
} from '@/lib/subscription-display';
import { DismissInvoiceAlertButton } from '@/components/subscription/dismiss-invoice-alert-button';
import { PurchaseReceiptAlertActions } from '@/components/subscription/purchase-receipt-alert-actions';

export function SubscriptionNoticeBanner({
  slug,
  subscription,
}: {
  slug: string;
  subscription?: TenantSubscription;
}) {
  const purchaseReceiptId = subscription?.purchaseReceipt?.id ?? null;
  const paymentInvoiceId = subscription?.subscriptionInvoice?.id ?? null;
  const purchaseReceiptDismissed = useSyncExternalStore(
    () => () => {},
    () => (purchaseReceiptId ? isInvoiceAlertDismissedLocally(purchaseReceiptId) : false),
    () => false,
  );
  const paymentInvoiceDismissed = useSyncExternalStore(
    () => () => {},
    () => (paymentInvoiceId ? isInvoiceAlertDismissedLocally(paymentInvoiceId) : false),
    () => false,
  );

  if (!subscription || subscription.isLocked || subscription.accessPhase === 'locked') {
    return null;
  }

  const subscribeHref = `/${slug}/subscription`;
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const phase = subscription.accessPhase;

  if (phase === 'grace') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-error/30 bg-error-container/30 px-4 py-3">
        <div className="min-w-0">
          <p className="font-body-emphasis text-on-surface">Subscription ended — grace period</p>
          <p className="font-caption text-on-surface-variant mt-0.5">
            Your subscription ended
            {periodEnd ? ` on ${periodEnd.toLocaleDateString()}` : ''}. Renew now to avoid read-only
            access.
          </p>
        </div>
        <Link href={subscribeHref} className="shrink-0">
          <Button variant="primary" className="w-full sm:w-auto">
            Renew now
          </Button>
        </Link>
      </div>
    );
  }

  if (phase === 'read_only' || subscription.isReadOnly) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-error/40 bg-error-container/40 px-4 py-3">
        <div className="min-w-0">
          <p className="font-body-emphasis text-on-surface">Account read-only</p>
          <p className="font-caption text-on-surface-variant mt-0.5">
            Your subscription has expired. You can view data but cannot make changes. Renew now, or
            contact the admin to export your data.
          </p>
        </div>
        <Link href={subscribeHref} className="shrink-0">
          <Button variant="primary" className="w-full sm:w-auto">
            Renew now
          </Button>
        </Link>
      </div>
    );
  }

  const status = subscriptionStatusOf(subscription);
  const daysLeft = getSubscriptionDaysRemaining(subscription);

  if (subscription.hasPendingPayment || phase === 'pending_verification') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-secondary/30 bg-secondary-container/40 px-4 py-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
            <Icon name="hourglass_top" className="text-secondary text-xl" />
          </div>
          <div className="min-w-0">
            <p className="font-body-emphasis text-on-surface">Payment under review</p>
            <p className="font-caption text-on-surface-variant mt-0.5">
              We received your payment proof. Your access stays active while our team verifies it.
            </p>
          </div>
        </div>
        <Link href={subscribeHref} className="shrink-0">
          <Button variant="outline" className="w-full sm:w-auto">View status</Button>
        </Link>
      </div>
    );
  }

  const receipt = subscription.purchaseReceipt;
  if (receipt && receipt.alertDaysRemaining > 0 && !purchaseReceiptDismissed) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-tertiary/30 bg-tertiary-container/30 px-4 py-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-tertiary/15 flex items-center justify-center shrink-0">
            <Icon name="receipt_long" className="text-tertiary text-xl" />
          </div>
          <div className="min-w-0">
            <p className="font-body-emphasis text-on-surface">Subscription purchase invoice</p>
            <p className="font-caption text-on-surface-variant mt-0.5">
              {receipt.invoiceNumber} · paid · download your invoice for your records
            </p>
            <p className="font-caption text-on-surface-variant/80 mt-1">
              This reminder can be hidden anytime; the PDF stays under Subscription.
            </p>
          </div>
        </div>
        <PurchaseReceiptAlertActions receipt={receipt} />
      </div>
    );
  }

  const invoice = subscription.subscriptionInvoice;
  if (invoice && invoice.alertDaysRemaining > 0 && !paymentInvoiceDismissed) {
    const urgent = invoice.daysUntilDue <= 2;
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
          urgent
            ? 'border-error/30 bg-error-container/30'
            : 'border-secondary/30 bg-secondary-container/40'
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              urgent ? 'bg-error/15' : 'bg-secondary/15'
            }`}
          >
            <Icon name="receipt_long" className={`text-xl ${urgent ? 'text-error' : 'text-secondary'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-body-emphasis text-on-surface">
              {urgent ? 'Subscription invoice due soon' : 'Subscription invoice'}
            </p>
            <p className="font-caption text-on-surface-variant mt-0.5">
              {invoice.invoiceNumber} · due in {formatDaysRemaining(invoice.daysUntilDue)}
              {invoice.alertDaysRemaining > 0
                ? ` · reminder visible for ${formatDaysRemaining(invoice.alertDaysRemaining)}`
                : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full sm:w-auto">
              <Icon name="picture_as_pdf" className="text-base" />
              Download PDF
            </Button>
          </a>
          <Link href={subscribeHref}>
            <Button variant={urgent ? 'primary' : 'secondary'} className="w-full sm:w-auto">
              Pay / upload proof
            </Button>
          </Link>
          <DismissInvoiceAlertButton invoiceId={invoice.id} label="Hide reminder" />
        </div>
      </div>
    );
  }

  if (status === 'TRIAL' && daysLeft != null) {
    const urgent = daysLeft <= 2;
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
          urgent
            ? 'border-error/30 bg-error-container/30'
            : 'border-secondary/30 bg-secondary-container/40'
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              urgent ? 'bg-error/15' : 'bg-secondary/15'
            }`}
          >
            <Icon
              name={urgent ? 'warning' : 'stars'}
              className={`text-xl ${urgent ? 'text-error' : 'text-secondary'}`}
            />
          </div>
          <div className="min-w-0">
            <p className="font-body-emphasis text-on-surface">
              {urgent ? 'Trial ending soon' : 'Free trial active'}
            </p>
            <p className="font-caption text-on-surface-variant mt-0.5">
              {formatDaysRemaining(daysLeft)} remaining
              {periodEnd ? ` · ends ${periodEnd.toLocaleDateString()}` : ''}. Subscribe to keep all features.
            </p>
          </div>
        </div>
        <Link href={subscribeHref} className="shrink-0">
          <Button variant={urgent ? 'primary' : 'secondary'} className="w-full sm:w-auto">
            Subscribe
          </Button>
        </Link>
      </div>
    );
  }

  if (status === 'ACTIVE' && daysLeft != null && subscription.expiryWarning) {
    const reminder = subscription.expiryReminderDays;
    const reminderLabel =
      reminder === 7
        ? '7-day renewal reminder'
        : reminder === 3
          ? '3-day renewal reminder'
          : reminder === 1
            ? 'Final day — renew today'
            : 'Subscription ending soon';
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-error/30 bg-error-container/30 px-4 py-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-error/15 flex items-center justify-center shrink-0">
            <Icon name="event_busy" className="text-error text-xl" />
          </div>
          <div className="min-w-0">
            <p className="font-body-emphasis text-on-surface">{reminderLabel}</p>
            <p className="font-caption text-on-surface-variant mt-0.5">
              {formatDaysRemaining(daysLeft)} remaining
              {periodEnd ? ` · renew by ${periodEnd.toLocaleDateString()}` : ''} to avoid losing access.
            </p>
          </div>
        </div>
        <Link href={subscribeHref} className="shrink-0">
          <Button variant="primary" className="w-full sm:w-auto">Renew</Button>
        </Link>
      </div>
    );
  }

  return null;
}
