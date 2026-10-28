'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { Button, Icon, Input, SelectField, Spinner, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { Modal } from '@/components/ui/modal';
import {
  usePlatformBillingSettings,
  usePlatformBusinesses,
  usePlatformPaymentSubmissions,
} from '@/lib/hooks/queries';
import {
  useApprovePaymentSubmission,
  useRejectPaymentSubmission,
  useUpdatePlatformBillingSettings,
} from '@/lib/hooks/mutations';
import { formatApiError } from '@/lib/api/errors';
import { useToast } from '@/lib/toast';
import type { PaymentSubmission, PlatformBillingSettings } from '@/lib/api/types';
import { SendSubscriptionInvoicePanel } from '@/components/platform/send-subscription-invoice-panel';
import { useSendPurchaseReceipt } from '@/lib/hooks/mutations';

function SettingsForm({
  settings,
}: {
  settings: PlatformBillingSettings;
}) {
  const toast = useToast();
  const updateSettings = useUpdatePlatformBillingSettings();
  const [form, setForm] = useState(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function save() {
    try {
      await updateSettings.mutateAsync(form);
      toast.success('Billing settings saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl card-hairline p-6 space-y-4">
      <h2 className="font-title-lg text-primary">Global billing settings</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Default trial days"
          type="number"
          min={1}
          max={365}
          value={String(form.defaultTrialDays)}
          onChange={(e) => setForm((f) => ({ ...f, defaultTrialDays: Number(e.target.value) }))}
        />
        <Input
          label="Currency"
          value={form.currency}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
        />
        <Input
          label="Monthly price"
          type="number"
          min={0}
          value={String(form.monthlyPrice)}
          onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: Number(e.target.value) }))}
        />
        <Input
          label="Yearly price (legacy display)"
          type="number"
          min={0}
          value={String(form.yearlyPrice)}
          onChange={(e) => setForm((f) => ({ ...f, yearlyPrice: Number(e.target.value) }))}
        />
        <Input
          label="Grace period (days after expiry)"
          type="number"
          min={0}
          max={30}
          value={String(form.gracePeriodDays ?? 2)}
          onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: Number(e.target.value) }))}
        />
        <Input
          label="Read-only period (days after grace)"
          type="number"
          min={0}
          max={90}
          value={String(form.readOnlyPeriodDays ?? 7)}
          onChange={(e) => setForm((f) => ({ ...f, readOnlyPeriodDays: Number(e.target.value) }))}
        />
        <Input
          label="Bank name"
          value={form.bankName ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value || null }))}
        />
        <Input
          label="Account title"
          value={form.accountTitle ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, accountTitle: e.target.value || null }))}
        />
        <Input
          label="Account number"
          value={form.accountNumber ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value || null }))}
        />
        <Input
          label="IBAN"
          value={form.iban ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value || null }))}
        />
        <Input
          label="SWIFT code"
          value={form.swiftCode ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, swiftCode: e.target.value || null }))}
        />
      </div>
      <Textarea
        label="Payment instructions"
        value={form.paymentInstructions ?? ''}
        onChange={(e) =>
          setForm((f) => ({ ...f, paymentInstructions: e.target.value || null }))
        }
        rows={4}
        placeholder="Additional instructions shown to tenants when paying..."
      />
      <Button
        type="button"
        variant="primary"
        onClick={save}
        disabled={updateSettings.isPending}
        className="cursor-pointer"
      >
        {updateSettings.isPending ? <Spinner className="h-4 w-4" /> : <Icon name="save" />}
        Save settings
      </Button>
    </div>
  );
}

function PaymentReviewCard({
  submission,
  onReview,
  onSendInvoice,
  sendingInvoice,
}: {
  submission: PaymentSubmission;
  onReview: (submission: PaymentSubmission) => void;
  onSendInvoice?: (submission: PaymentSubmission) => void;
  sendingInvoice?: boolean;
}) {
  return (
    <div className="p-4 border border-outline-variant/20 rounded-xl bg-surface-container-lowest space-y-3">
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="font-body-emphasis text-primary">
            {submission.business?.name ?? submission.businessId}
          </p>
          <p className="font-caption text-on-surface-variant">
            {submission.durationMonths ?? submission.interval} mo · {submission.amount}
            {submission.expectedAmount != null ? ` (expected ${submission.expectedAmount})` : ''} ·{' '}
            {new Date(submission.createdAt).toLocaleString()}
          </p>
          {submission.transactionReference && (
            <p className="font-caption text-on-surface-variant">
              Txn ref: {submission.transactionReference}
            </p>
          )}
          {submission.tempAccessGranted && submission.tempAccessUntil && (
            <p
              className={`font-caption ${
                Date.now() - new Date(submission.createdAt).getTime() > 48 * 3600000
                  ? 'text-error'
                  : 'text-secondary'
              }`}
            >
              Temp access until {new Date(submission.tempAccessUntil).toLocaleString()}
              {Date.now() - new Date(submission.createdAt).getTime() > 48 * 3600000
                ? ' · pending over 48h'
                : ''}
            </p>
          )}
        </div>
        <span
          className={`font-caption uppercase px-2 py-1 rounded-full ${
            submission.status === 'PENDING'
              ? 'bg-secondary-container text-on-secondary-container'
              : submission.status === 'APPROVED'
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-error-container text-on-error-container'
          }`}
        >
          {submission.status}
        </span>
      </div>
      <a
        href={submission.proofImageUrl}
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg overflow-hidden border border-outline-variant/20 max-h-48"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={submission.proofImageUrl}
          alt="Payment proof"
          className="w-full h-48 object-contain bg-surface-container-low"
        />
      </a>
      {submission.status === 'PENDING' && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onReview(submission)}
          className="cursor-pointer w-full"
        >
          Review payment
        </Button>
      )}
      {submission.status === 'APPROVED' && onSendInvoice && (
        <Button
          type="button"
          variant="secondary"
          loading={sendingInvoice}
          onClick={() => onSendInvoice(submission)}
          className="cursor-pointer w-full"
        >
          <Icon name="send" />
          Resend purchase invoice
        </Button>
      )}
      {submission.adminNote && (
        <p className="font-caption text-on-surface-variant">Note: {submission.adminNote}</p>
      )}
    </div>
  );
}

export default function PlatformBillingPage() {
  const toast = useToast();
  const { data: settings, isLoading: settingsLoading } = usePlatformBillingSettings();
  const { data: businesses = [] } = usePlatformBusinesses();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [businessFilter, setBusinessFilter] = useState('');
  const { data: submissions = [], isLoading: paymentsLoading } = usePlatformPaymentSubmissions({
    status: statusFilter || undefined,
    businessId: businessFilter || undefined,
  });
  const approve = useApprovePaymentSubmission();
  const reject = useRejectPaymentSubmission();
  const sendPurchaseReceipt = useSendPurchaseReceipt();
  const [reviewTarget, setReviewTarget] = useState<PaymentSubmission | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [reviewDurationMonths, setReviewDurationMonths] = useState('1');
  const [reviewOverrideAmount, setReviewOverrideAmount] = useState('');
  const [invoiceSendingId, setInvoiceSendingId] = useState<string | null>(null);

  const invoiceTenantOptions = useMemo(() => {
    return businesses
      .filter(
        (b) =>
          !b.isSuspended &&
          (b.subscriptionStatus === 'ACTIVE' ||
            b.subscriptionStatus === 'PAST_DUE' ||
            b.subscriptionStatus === 'TRIAL'),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [businesses]);

  async function handleSendPurchaseInvoiceForSubmission(submission: PaymentSubmission) {
    setInvoiceSendingId(submission.id);
    try {
      const result = await sendPurchaseReceipt.mutateAsync({
        businessId: submission.businessId,
        paymentSubmissionId: submission.id,
      });
      toast.success(`Purchase invoice ${result.invoice.invoiceNumber} sent to tenant`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setInvoiceSendingId(null);
    }
  }

  function openReview(submission: PaymentSubmission) {
    setReviewTarget(submission);
    setReviewDurationMonths(String(submission.durationMonths ?? (submission.interval === 'YEARLY' ? 12 : 1)));
    setReviewOverrideAmount(String(submission.amount));
    setAdminNote('');
  }

  async function handleApprove() {
    if (!reviewTarget) return;
    try {
      await approve.mutateAsync({
        id: reviewTarget.id,
        adminNote: adminNote || undefined,
        durationMonths: Number(reviewDurationMonths) || undefined,
        overrideFinalAmount: reviewOverrideAmount ? Number(reviewOverrideAmount) : undefined,
      });
      toast.success('Payment approved — subscription activated and purchase invoice sent');
      setReviewTarget(null);
      setAdminNote('');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleReject() {
    if (!reviewTarget) return;
    try {
      await reject.mutateAsync({ id: reviewTarget.id, adminNote: adminNote || undefined });
      toast.success('Payment rejected');
      setReviewTarget(null);
      setAdminNote('');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <PlatformLayout title="Billing">
      <PageHeader
        title="Billing & subscriptions"
        description="Configure trial periods, pricing, bank details, and review tenant payment proofs."
      />

      {settingsLoading || !settings ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <SettingsForm settings={settings} />
      )}

      <div className="mt-8 bg-surface-container-lowest rounded-xl card-hairline p-6">
        <h2 className="font-title-lg text-primary mb-4">Subscription invoices</h2>
        <SendSubscriptionInvoicePanel
          showTenantPicker
          tenantOptions={invoiceTenantOptions}
        />
      </div>

      <div className="mt-8 bg-surface-container-lowest rounded-xl card-hairline overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/20 flex flex-wrap gap-4 items-end justify-between">
          <h2 className="font-title-lg text-primary">Payment submissions</h2>
          <div className="flex flex-wrap gap-3">
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: '', label: 'All' },
              ]}
            />
            <SelectField
              label="Tenant"
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              options={[
                { value: '', label: 'All tenants' },
                ...businesses.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
        </div>
        <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paymentsLoading && <p className="font-caption col-span-full">Loading…</p>}
          {!paymentsLoading && submissions.length === 0 && (
            <p className="font-caption text-on-surface-variant col-span-full">
              No payment submissions found.
            </p>
          )}
          {submissions.map((s) => (
            <PaymentReviewCard
              key={s.id}
              submission={s}
              onReview={openReview}
              onSendInvoice={handleSendPurchaseInvoiceForSubmission}
              sendingInvoice={invoiceSendingId === s.id}
            />
          ))}
        </div>
      </div>

      <Modal
        open={!!reviewTarget}
        onClose={() => {
          setReviewTarget(null);
          setAdminNote('');
        }}
        title="Review payment"
      >
        {reviewTarget && (
          <div className="space-y-4">
            <p className="font-body-base text-on-surface-variant">
              {reviewTarget.business?.name} — submitted {reviewTarget.amount}
              {reviewTarget.expectedAmount != null ? ` (expected ${reviewTarget.expectedAmount})` : ''}
            </p>
            <SelectField
              label="Renewal duration (months)"
              value={reviewDurationMonths}
              onChange={(e) => setReviewDurationMonths(e.target.value)}
              options={[1, 3, 6, 9, 12].map((m) => ({
                value: String(m),
                label: `${m} month${m > 1 ? 's' : ''}`,
              }))}
            />
            <Input
              label="Final amount to apply"
              type="number"
              min={0}
              value={reviewOverrideAmount}
              onChange={(e) => setReviewOverrideAmount(e.target.value)}
            />
            <Textarea
              label="Admin note (optional)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Reason for rejection or internal note..."
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleApprove}
                disabled={approve.isPending || reject.isPending}
                className="cursor-pointer flex-1"
              >
                Approve & activate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReject}
                disabled={approve.isPending || reject.isPending}
                className="cursor-pointer flex-1"
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PlatformLayout>
  );
}
