'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, Input, SelectField } from '@/components/ui';
import type { PlatformBusiness } from '@/lib/api/types';
import {
  useDismissPlatformSubscriptionInvoiceAlert,
  useSendPurchaseReceipt,
  useSendSubscriptionInvoice,
} from '@/lib/hooks/mutations';
import { usePlatformBusinessSubscriptionInvoices } from '@/lib/hooks/queries';
import { formatApiError } from '@/lib/api/errors';
import { useToast } from '@/lib/toast';
import {
  adminSubscriptionAccessLabel,
  getSubscriptionPeriodEnd,
} from '@/lib/subscription-display';

function defaultIntervalForBusiness(b: PlatformBusiness | null | undefined): 'MONTHLY' | 'YEARLY' {
  if (b?.billingInterval === 'YEARLY') return 'YEARLY';
  if (b?.billingInterval === 'MONTHLY') return 'MONTHLY';
  return 'MONTHLY';
}

export function SendSubscriptionInvoicePanel({
  business,
  tenantOptions,
  showTenantPicker = false,
}: {
  /** When set, invoice is sent to this tenant (business detail drawer). */
  business?: PlatformBusiness | null;
  /** For billing page: pick among subscribers. */
  tenantOptions?: PlatformBusiness[];
  showTenantPicker?: boolean;
}) {
  const toast = useToast();
  const sendInvoice = useSendSubscriptionInvoice();
  const sendPurchaseReceipt = useSendPurchaseReceipt();

  const [selectedId, setSelectedId] = useState('');
  const [invoiceInterval, setInvoiceInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [invoiceDueInDays, setInvoiceDueInDays] = useState('14');
  const [invoiceAlertDays, setInvoiceAlertDays] = useState('7');
  const [purchaseAlertDays, setPurchaseAlertDays] = useState('30');
  const [invoiceNote, setInvoiceNote] = useState('');

  const selectedBusiness = useMemo(() => {
    if (business) return business;
    return tenantOptions?.find((t) => t.id === selectedId) ?? null;
  }, [business, tenantOptions, selectedId]);

  useEffect(() => {
    if (business) {
      setInvoiceInterval(defaultIntervalForBusiness(business));
      return;
    }
    if (selectedBusiness) {
      setInvoiceInterval(defaultIntervalForBusiness(selectedBusiness));
    }
  }, [business, selectedBusiness]);

  useEffect(() => {
    if (!showTenantPicker || !tenantOptions?.length) return;
    if (!selectedId && tenantOptions[0]) {
      setSelectedId(tenantOptions[0].id);
    }
  }, [showTenantPicker, tenantOptions, selectedId]);

  const targetId = business?.id ?? selectedId;

  const dismissAlert = useDismissPlatformSubscriptionInvoiceAlert();
  const { data: recentInvoices = [] } = usePlatformBusinessSubscriptionInvoices(targetId || null);

  async function handleSend() {
    if (!targetId) {
      toast.error('Select a tenant');
      return;
    }
    try {
      const result = await sendInvoice.mutateAsync({
        businessId: targetId,
        interval: invoiceInterval,
        dueInDays: Number(invoiceDueInDays) || 14,
        alertDays: Number(invoiceAlertDays) || 7,
        note: invoiceNote.trim() || undefined,
      });
      toast.success(`Invoice ${result.invoice.invoiceNumber} sent`);
      setInvoiceNote('');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  const periodEnd = selectedBusiness ? getSubscriptionPeriodEnd(selectedBusiness) : null;
  const canSendPurchaseReceipt =
    selectedBusiness &&
    (selectedBusiness.subscriptionStatus === 'ACTIVE' ||
      selectedBusiness.subscriptionStatus === 'PAST_DUE') &&
    selectedBusiness.billingInterval;

  async function handleSendPurchaseReceipt() {
    if (!targetId) {
      toast.error('Select a tenant');
      return;
    }
    try {
      const result = await sendPurchaseReceipt.mutateAsync({
        businessId: targetId,
        alertDays: Number(purchaseAlertDays),
      });
      toast.success(`Purchase invoice ${result.invoice.invoiceNumber} sent`);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  const invoiceReminders =
    targetId && recentInvoices.length > 0 ? (
      <div className="rounded-xl border border-secondary/30 bg-secondary-container/20 p-4 space-y-3">
        <div>
          <p className="font-body-emphasis text-primary">Hide tenant dashboard banner</p>
          <p className="font-caption text-on-surface-variant mt-0.5">
            Stops the paid-invoice strip on the tenant app immediately (PDF is not deleted).
          </p>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {recentInvoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm border border-outline-variant/15"
            >
              <div className="min-w-0">
                <p className="font-body-emphasis truncate">
                  {inv.invoiceNumber}{' '}
                  <span className="text-on-surface-variant font-normal">
                    · {inv.kind === 'PURCHASE_RECEIPT' ? 'paid' : (inv.status ?? 'open').toLowerCase()}
                  </span>
                </p>
                <p className="text-xs text-on-surface-variant">
                  {inv.alertActive
                    ? `Banner showing · ${inv.alertDaysRemaining} day(s) left`
                    : 'Banner already hidden'}
                </p>
              </div>
              {inv.alertActive && (
                <Button
                  type="button"
                  variant="primary"
                  loading={dismissAlert.isPending}
                  onClick={async () => {
                    try {
                      await dismissAlert.mutateAsync({ businessId: targetId, invoiceId: inv.id });
                      toast.success(`Banner hidden for ${inv.invoiceNumber}`);
                    } catch (err) {
                      toast.error(formatApiError(err));
                    }
                  }}
                >
                  Hide banner now
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="space-y-4">
    {invoiceReminders}
    <div className="rounded-xl border border-outline-variant/20 p-4 space-y-3">
      <div>
        <p className="font-body-emphasis text-primary">Send subscription invoice (PDF)</p>
        <p className="font-caption text-on-surface-variant mt-0.5">
          Ask the tenant to pay (before or during trial). They get a dashboard reminder and a PDF with
          bank details.
        </p>
      </div>

      {showTenantPicker && tenantOptions && (
        <SelectField
          label="Subscriber tenant"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          options={[
            { value: '', label: 'Select tenant' },
            ...tenantOptions.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.subscriptionStatus}${t.billingInterval ? ` · ${t.billingInterval}` : ''})`,
            })),
          ]}
        />
      )}

      {selectedBusiness && (
        <div className="rounded-lg bg-surface-container-low px-3 py-2 text-sm">
          <p className="font-body-emphasis">{selectedBusiness.name}</p>
          <p className="text-on-surface-variant text-xs mt-0.5">
            {adminSubscriptionAccessLabel(selectedBusiness)}
            {periodEnd ? ` · period ends ${periodEnd.toLocaleDateString()}` : ''}
            {selectedBusiness.billingInterval
              ? ` · billed ${selectedBusiness.billingInterval.toLowerCase()}`
              : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SelectField
          label="Plan amount"
          value={invoiceInterval}
          onChange={(e) => setInvoiceInterval(e.target.value as 'MONTHLY' | 'YEARLY')}
          options={[
            { value: 'MONTHLY', label: 'Monthly plan price' },
            { value: 'YEARLY', label: 'Yearly plan price' },
          ]}
        />
        <Input
          label="Payment due in (days)"
          type="number"
          min={1}
          max={365}
          value={invoiceDueInDays}
          onChange={(e) => setInvoiceDueInDays(e.target.value)}
        />
        <Input
          label="Show alert for (days)"
          type="number"
          min={1}
          max={90}
          value={invoiceAlertDays}
          onChange={(e) => setInvoiceAlertDays(e.target.value)}
        />
      </div>
      <Input
        label="Note on invoice (optional)"
        value={invoiceNote}
        onChange={(e) => setInvoiceNote(e.target.value)}
        placeholder="e.g. Renewal for March 2026"
      />
      <Button
        type="button"
        variant="primary"
        loading={sendInvoice.isPending}
        disabled={!targetId}
        onClick={handleSend}
      >
        <Icon name="send" />
        Send payment request
      </Button>
    </div>

    {canSendPurchaseReceipt && (
      <div className="rounded-xl border border-outline-variant/20 p-4 space-y-3">
        <div>
          <p className="font-body-emphasis text-primary">Send purchase invoice (paid)</p>
          <p className="font-caption text-on-surface-variant mt-0.5">
            Proof that they bought the subscription. Issued automatically when you approve payment;
            use this to resend or for older subscribers.
          </p>
        </div>
        <Input
          label="Show dashboard banner for (days)"
          type="number"
          min={0}
          max={90}
          value={purchaseAlertDays}
          onChange={(e) => setPurchaseAlertDays(e.target.value)}
          hint="0 = PDF only, no tenant banner"
        />
        <Button
          type="button"
          variant="secondary"
          loading={sendPurchaseReceipt.isPending}
          disabled={!targetId}
          onClick={handleSendPurchaseReceipt}
        >
          <Icon name="receipt_long" />
          Send purchase invoice
        </Button>
      </div>
    )}
    </div>
  );
}
