'use client';

import type { ReactNode } from 'react';
import { Button, Icon, Spinner } from '@/components/ui';
import {
  EmptyState,
  MetricPill,
  PageHeader,
  SectionCard,
} from '@/components/ui/page-shell';
import { SubscriptionPaymentPanel } from '@/components/subscription/subscription-payment-panel';
import {
  useMyPaymentSubmissions,
  useSubscription,
  useSubscriptionInvoices,
} from '@/lib/hooks/queries';
import type { SubscriptionInvoiceListItem, TenantSubscription } from '@/lib/api/types';
import { getSubscriptionDaysRemaining, getSubscriptionPeriodEnd } from '@/lib/subscription-display';

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function statusLabel(sub: TenantSubscription): string {
  const raw = sub.status ?? sub.subscriptionStatus ?? '—';
  if (raw === 'TRIAL') return 'Free trial';
  if (raw === 'ACTIVE') return 'Active';
  return raw.replace(/_/g, ' ');
}

function statusBadge(sub: TenantSubscription): string {
  const raw = sub.status ?? sub.subscriptionStatus ?? '';
  if (sub.hasPendingPayment) return 'Review pending';
  if (sub.isSubscriptionBlocked) return 'Blocked';
  if (sub.isLocked) return 'Locked';
  if (raw === 'TRIAL') return 'Trial';
  if (raw === 'ACTIVE') return 'Active';
  return raw.replace(/_/g, ' ') || '—';
}

function invoiceKindLabel(kind?: string | null) {
  if (kind === 'PURCHASE_RECEIPT') return 'Receipt';
  if (kind === 'PAYMENT_REQUEST') return 'Due';
  return 'Invoice';
}

function submissionStatusTone(status: string): 'default' | 'warning' | 'success' {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING') return 'warning';
  return 'default';
}

function InvoiceRow({ inv }: { inv: SubscriptionInvoiceListItem }) {
  const paid = inv.status === 'PAID';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 first:pt-0 last:pb-0 border-b border-outline-variant/10 last:border-0">
      <div
        className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
          paid ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : 'bg-primary/10 text-primary'
        }`}
      >
        <Icon name={paid ? 'check_circle' : 'receipt_long'} className="text-xl" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-primary">{inv.invoiceNumber}</span>
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
            {invoiceKindLabel(inv.kind)}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
              paid
                ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary-fixed-dim/40'
                : inv.status === 'CANCELLED'
                  ? 'bg-surface-container-high text-on-surface-variant'
                  : 'bg-secondary-fixed/60 text-on-secondary-fixed-variant border border-secondary/20'
            }`}
          >
            {inv.status ?? 'OPEN'}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant mt-1">
          Sent {new Date(inv.sentAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          {inv.periodEndsAt
            ? ` · covers until ${new Date(inv.periodEndsAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
            : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1 shrink-0">
        <p className="font-bold text-primary tabular-nums">{formatMoney(inv.amount, inv.currency)}</p>
        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="outline" className="cursor-pointer h-9 py-1.5 px-3 text-sm">
            <Icon name="picture_as_pdf" className="text-lg" />
            PDF
          </Button>
        </a>
      </div>
    </div>
  );
}

function AlertBanner({
  tone,
  icon,
  children,
}: {
  tone: 'warning' | 'error' | 'info';
  icon: string;
  children: ReactNode;
}) {
  const styles = {
    warning: 'border-secondary/30 bg-secondary-container/25 text-on-surface',
    error: 'border-error/30 bg-error-container/20 text-on-surface',
    info: 'border-primary/25 bg-primary/5 text-on-surface',
  };
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 ${styles[tone]}`}>
      <Icon name={icon} className="text-xl shrink-0 text-primary mt-0.5" />
      <div className="text-sm leading-relaxed min-w-0">{children}</div>
    </div>
  );
}

function PlanHero({ subscription }: { subscription: TenantSubscription }) {
  const daysLeft = getSubscriptionDaysRemaining(subscription);
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const monthly =
    subscription.effectiveMonthlyPrice ??
    subscription.customMonthlyPrice ??
    subscription.plans?.monthly?.price;
  const currency = subscription.plans?.monthly?.currency ?? 'PKR';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#3a8a7c] to-[#2a5f56] text-on-primary shadow-lg shadow-primary/15">
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, white 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-on-primary/80">
            Billing overview
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{statusLabel(subscription)}</h2>
          {periodEnd && (
            <p className="text-on-primary/90 text-sm md:text-base">
              Current period ends{' '}
              <strong className="font-bold">
                {periodEnd.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
            </p>
          )}
          {monthly != null && (
            <p className="text-on-primary/85 text-sm">
              {formatMoney(Number(monthly), currency)} / month
              {subscription.billingInterval
                ? ` · billed ${subscription.billingInterval.toLowerCase()}`
                : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 lg:flex-col lg:justify-center lg:min-w-[200px]">
          {daysLeft != null && (
            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 px-6 py-4 text-center flex-1 min-w-[140px]">
              <p className="text-4xl md:text-5xl font-bold tabular-nums leading-none">{daysLeft}</p>
              <p className="text-xs uppercase tracking-wider font-bold mt-2 text-on-primary/85">
                {subscription.status === 'TRIAL' ? 'trial days left' : 'days remaining'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SubscriptionOwnerPage({
  embedded,
}: {
  slug?: string;
  embedded?: boolean;
}) {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: invoices = [], isLoading: invLoading } = useSubscriptionInvoices();
  const { data: submissions = [] } = useMyPaymentSubmissions();

  if (subLoading || !subscription) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const metrics = [
    subscription.billingInterval
      ? { label: 'Interval', value: subscription.billingInterval, icon: 'event_repeat' }
      : null,
    subscription.accessPhase &&
    !['active', 'trial'].includes(subscription.accessPhase)
      ? {
          label: 'Access',
          value: subscription.accessPhase.replace(/_/g, ' '),
          icon: 'shield',
          tone: 'warning' as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    icon: string;
    tone?: 'default' | 'primary' | 'warning' | 'success';
  }>;

  const content = (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto w-full">
      <PlanHero subscription={subscription} />

      {subscription.hasPendingPayment && (
        <AlertBanner tone="warning" icon="hourglass_top">
          Your payment proof is with our team. You will get full access again once it is approved.
        </AlertBanner>
      )}
      {subscription.isSubscriptionBlocked && (
        <AlertBanner tone="error" icon="block">
          Platform billing is blocked for this account. Contact{' '}
          <strong>Nasmak Labs support</strong> to restore access.
        </AlertBanner>
      )}
      {subscription.subscriptionInvoice &&
        subscription.subscriptionInvoice.alertDaysRemaining > 0 && (
          <AlertBanner tone="info" icon="mail">
            Invoice <strong>{subscription.subscriptionInvoice.invoiceNumber}</strong> is due in{' '}
            {subscription.subscriptionInvoice.daysUntilDue} day
            {subscription.subscriptionInvoice.daysUntilDue === 1 ? '' : 's'}.{' '}
            <a
              href={subscription.subscriptionInvoice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              View PDF
            </a>
          </AlertBanner>
        )}

      {metrics.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {metrics.map((m) => (
            <MetricPill
              key={m.label}
              label={m.label}
              value={m.value}
              icon={m.icon}
              tone={m.tone ?? 'default'}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <SectionCard
            title="Billing documents"
            description="Invoices and receipts from Hisab Wise billing"
            action={invLoading ? <Spinner className="h-5 w-5 text-primary" /> : undefined}
          >
            {invoices.length === 0 && !invLoading ? (
              <EmptyState
                compact
                icon="folder_open"
                title="No documents yet"
                description="When we send a payment request or paid receipt, it will show up here with a PDF download."
              />
            ) : (
              <div>{invoices.map((inv) => (
                <InvoiceRow key={inv.id} inv={inv} />
              ))}</div>
            )}
          </SectionCard>

          {submissions.length > 0 && (
            <SectionCard
              title="Payment history"
              description="Proof you submitted for bank transfers"
            >
              <ul className="space-y-0">
                {submissions.slice(0, 8).map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-outline-variant/10 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-primary tabular-nums">
                        {formatMoney(Number(s.amount), 'PKR')}
                        <span className="font-normal text-on-surface-variant ml-2">
                          · {s.durationMonths ? `${s.durationMonths} months` : s.interval}
                        </span>
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {new Date(s.createdAt).toLocaleString()}
                        {s.transactionReference ? ` · ${s.transactionReference}` : ''}
                      </p>
                    </div>
                    <MetricPill
                      label="Status"
                      value={s.status}
                      tone={submissionStatusTone(s.status)}
                    />
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        <div className="xl:sticky xl:top-24 space-y-4">
          <SectionCard
            title="Renew or extend"
            description="Bank transfer · upload proof after paying"
            bodyClassName="p-4 md:p-5 bg-surface-container-low/30"
          >
            <SubscriptionPaymentPanel
              subscription={subscription}
              compact
              skipInvoiceHighlights
              sidebarLayout
            />
          </SectionCard>
          {subscription.status === 'ACTIVE' && !subscription.isLocked && (
            <p className="text-xs text-center text-on-surface-variant px-2 leading-relaxed">
              Extend early anytime — your new period starts after the current one ends.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Renew your subscription</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Pay via bank transfer to unlock your restaurant again.
          </p>
        </div>
        {content}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        icon="card_membership"
        title="Subscription"
        description="Plan status, billing documents, and renewal in one place."
        badge={statusBadge(subscription)}
      />
      {content}
    </>
  );
}
