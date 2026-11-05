'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, Input, SelectField } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { formatVariance } from '@/components/cash-shift/shift-shared';
import { formatApiError } from '@/lib/api/errors';
import type { CashShift } from '@/lib/api/types';
import {
  CLOSING_SETTLEMENT_OPTIONS,
  closingSettlementLabel,
  type CashClosingSettlement,
} from '@/lib/cash-shift/closing-settlement';
import { useCloseCashShift, useOpenCashShift } from '@/lib/hooks/mutations';
import {
  useBusiness,
  useCashShiftSummary,
  useCurrentBusinessDay,
  useCurrentCashShift,
  useReceiptTemplate,
  useSettlementAccounts,
} from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { printShiftCloseReport } from '@/lib/print-shift-close-report';
import { useToast } from '@/lib/toast';

export function ShiftPowerButton() {
  const { data: shift, isLoading } = useCurrentCashShift();
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const isLive = Boolean(shift);

  return (
    <>
      <button
        type="button"
        title={isLive ? 'Shift is live — close shift' : 'No active shift — open shift'}
        aria-label={isLive ? 'Close shift' : 'Open shift'}
        disabled={isLoading}
        onClick={() => (isLive ? setCloseModal(true) : setOpenModal(true))}
        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition-colors tap-target disabled:cursor-not-allowed sm:px-2.5 sm:text-xs ${
          isLive
            ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-red-400/30 bg-red-50 text-red-700 hover:bg-red-100'
        }`}
      >
        <Icon name="power_settings_new" className="text-sm" />
        <span className="hidden sm:inline">{isLive ? 'Close shift' : 'Open shift'}</span>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-red-500'}`}
          aria-hidden
        />
      </button>

      <ShiftOpenModal open={openModal} onClose={() => setOpenModal(false)} />
      {shift && (
        <ShiftCloseModal open={closeModal} onClose={() => setCloseModal(false)} shift={shift} />
      )}
    </>
  );
}

function ShiftOpenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const openShift = useOpenCashShift();
  const { data: businessDayState } = useCurrentBusinessDay();
  const businessDay = businessDayState?.businessDay;
  const [openingCash, setOpeningCash] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setOpeningCash('');
      setError('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await openShift.mutateAsync(Number(openingCash) || 0);
      toast.success('Shift started');
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start shift"
      description="Count the cash in the drawer and enter the starting float. A business day must be open first."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={openShift.isPending}
            disabled={!businessDay}
            onClick={handleSubmit}
          >
            Start shift
          </Button>
        </>
      }
    >
      {!businessDay && (
        <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Open the business day before starting a cash shift.
        </p>
      )}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Starting float"
          type="number"
          min={0}
          step="0.01"
          value={openingCash}
          onChange={(e) => setOpeningCash(e.target.value)}
          placeholder="0.00"
          required
          autoFocus
        />
        {error && <p className="font-caption text-error">{error}</p>}
      </form>
    </Modal>
  );
}

export function ShiftCloseModal({
  open,
  onClose,
  shift,
}: {
  open: boolean;
  onClose: () => void;
  shift: CashShift;
}) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();
  const { data: accounts = [], isLoading: accountsLoading } = useSettlementAccounts();
  const { data: summaryData, isLoading: summaryLoading } = useCashShiftSummary(open ? shift.id : undefined);
  const closeShift = useCloseCashShift();

  const expectedCash =
    summaryData?.summary?.expectedCash ?? shift.stats?.expectedCash ?? null;

  const [actualCash, setActualCash] = useState('');
  const [closingSettlement, setClosingSettlement] = useState<CashClosingSettlement>('KEEP_IN_DRAWER');
  const [transferredCash, setTransferredCash] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [error, setError] = useState('');
  const [closedShift, setClosedShift] = useState<CashShift | null>(null);

  const accountOptions = useMemo(() => {
    const preferredType =
      closingSettlement === 'TRANSFER_TO_WALLET'
        ? 'WALLET'
        : closingSettlement === 'TRANSFER_TO_BANK'
          ? 'BANK'
          : closingSettlement === 'HANDOVER_TO_OWNER'
            ? 'OWNER'
            : closingSettlement === 'KEEP_IN_DRAWER'
              ? 'DRAWER'
              : undefined;

    const filtered = preferredType
      ? accounts.filter((a) => a.accountType === preferredType || a.accountType === 'OTHER')
      : accounts;

    return filtered.map((a) => ({ value: a.id, label: a.name }));
  }, [accounts, closingSettlement]);

  useEffect(() => {
    if (!open) {
      setActualCash('');
      setClosingSettlement('KEEP_IN_DRAWER');
      setTransferredCash('');
      setDestinationAccountId('');
      setCloseNotes('');
      setError('');
      setClosedShift(null);
      return;
    }
    if (accountOptions[0] && !destinationAccountId) {
      setDestinationAccountId(accountOptions[0].value);
    }
  }, [open, accountOptions, destinationAccountId]);

  useEffect(() => {
    if (accountOptions[0]) setDestinationAccountId(accountOptions[0].value);
  }, [closingSettlement, accountOptions]);

  const countEntered = actualCash.trim() !== '';
  const countedAmount = countEntered ? Number(actualCash) : NaN;
  const countIsValid = countEntered && Number.isFinite(countedAmount) && countedAmount >= 0;

  function applyExpectedAsCount() {
    if (expectedCash == null || summaryLoading) return;
    setActualCash(String(Number(expectedCash)));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!countEntered) {
      setError('Please write how much cash you counted in the drawer.');
      return;
    }
    if (!countIsValid) {
      setError('Please write a correct cash amount.');
      return;
    }

    const needsTransferDetails = closingSettlement !== 'KEEP_IN_DRAWER';
    let transferred = countedAmount;
    if (needsTransferDetails) {
      const parsed = Number(transferredCash);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Write how much cash you are taking out of the drawer.');
        return;
      }
      transferred = parsed;
    }

    if (!destinationAccountId) {
      setError('Please pick where the cash is going.');
      return;
    }

    try {
      const closed = await closeShift.mutateAsync({
        shiftId: shift.id,
        actualCash: countedAmount,
        notes: closeNotes.trim() || undefined,
        closingSettlement,
        transferredCash: transferred,
        destinationAccountId: destinationAccountId || null,
      });
      setClosedShift(closed);
      toast.success('Shift closed');
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  function handlePrint() {
    if (!closedShift) return;
    printShiftCloseReport({
      shift: closedShift,
      summary: summaryData?.summary,
      businessName: business?.name,
      businessLocation: business?.location,
      formatMoney,
      widthMm: receiptTemplate?.receiptWidthMm ?? 80,
    });
  }

  if (closedShift) {
    const variance = formatVariance(closedShift.variance, formatMoney);
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Shift closed"
        description="Your shift has been closed successfully."
        footer={
          <>
            <Button variant="outline" onClick={handlePrint}>
              <Icon name="print" className="text-base" />
              Print closing report
            </Button>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </>
        }
      >
        <div className="space-y-4 font-body-base">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="font-caption text-on-surface-variant">Expected cash</p>
              <p className="font-mono text-lg text-primary mt-1">{formatMoney(closedShift.expectedCash)}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="font-caption text-on-surface-variant">Actual counted</p>
              <p className="font-mono text-lg text-primary mt-1">{formatMoney(closedShift.actualCash)}</p>
            </div>
          </div>
          <p className="flex justify-center sm:justify-start">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${variance.className}`}>
              {variance.label}
            </span>
          </p>
          {closedShift.closingSettlement && (
            <p>
              Settlement: <strong>{closingSettlementLabel(closedShift.closingSettlement)}</strong>
            </p>
          )}
          {closedShift.transferredCash && (
            <p>
              Transferred: <strong>{formatMoney(closedShift.transferredCash)}</strong>
              {closedShift.destinationAccountName ? ` → ${closedShift.destinationAccountName}` : ''}
            </p>
          )}
        </div>
      </Modal>
    );
  }

  const variancePreview =
    expectedCash != null && countIsValid
      ? formatVariance(countedAmount - Number(expectedCash), formatMoney)
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close shift"
      description="Count all cash in the drawer. Write the total below, then tap Close shift."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="close-shift-form"
            loading={closeShift.isPending}
            disabled={!countIsValid || accountsLoading || accountOptions.length === 0}
          >
            {countIsValid ? 'Close shift' : 'Add cash amount first'}
          </Button>
        </>
      }
    >
      <form id="close-shift-form" className="space-y-4" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 space-y-3.5">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
              1
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-body-emphasis text-primary">Count cash in the drawer</p>
              <p className="font-caption text-on-surface-variant">
                Count notes and coins in the till. Write the real amount on the right.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-caption font-bold text-on-surface-variant block">
                Cash system expects
              </label>
              <div
                className="flex h-11 items-center px-3 rounded-lg border border-outline-variant/30 bg-surface font-mono text-base font-semibold text-primary tabular-nums"
                aria-live="polite"
              >
                {summaryLoading ? 'Calculating…' : expectedCash != null ? formatMoney(expectedCash) : '—'}
              </div>
              <p className="font-caption text-on-surface-variant">From today&apos;s sales and cash in/out</p>
            </div>

            <div className="space-y-1.5">
              <Input
                label="Cash you counted (required)"
                type="number"
                min={0}
                step="0.01"
                value={actualCash}
                onChange={(e) => {
                  setActualCash(e.target.value);
                  setError('');
                }}
                placeholder="Write amount here"
                autoFocus
                className="border-primary/35 font-mono font-semibold text-primary"
              />
              {expectedCash != null && !summaryLoading && (
                <button
                  type="button"
                  onClick={applyExpectedAsCount}
                  className="font-caption font-semibold text-primary hover:underline cursor-pointer text-left"
                >
                  Same as expected: {formatMoney(expectedCash)}
                </button>
              )}
            </div>
          </div>

          {variancePreview && (
            <p className="flex justify-center sm:justify-start">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${variancePreview.className}`}
              >
                {variancePreview.label}
              </span>
            </p>
          )}

          {!countEntered && (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
              role="alert"
            >
              <p className="font-semibold text-on-surface mb-0.5">Write cash amount before you close</p>
              <p className="font-caption leading-relaxed">
                <strong>Do not tap Close shift</strong> until the counted cash box is filled. If empty, the
                system saves <strong className="text-red-700">{formatMoney(0)}</strong> and your{' '}
                <strong>cash report will be wrong</strong>.
              </p>
            </div>
          )}
        </section>

        {countIsValid && (
          <section className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30">
                2
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-body-emphasis text-on-surface">What to do with this cash?</p>
                <p className="font-caption text-on-surface-variant">
                  Usually cash <strong>stays in the drawer</strong>. Change only if you take cash out.
                </p>
              </div>
            </div>

            <SelectField
              label="Cash after closing"
              value={closingSettlement}
              onChange={(e) => {
                const next = e.target.value as CashClosingSettlement;
                setClosingSettlement(next);
                if (next !== 'KEEP_IN_DRAWER') {
                  setTransferredCash((prev) => prev || actualCash);
                }
              }}
              options={CLOSING_SETTLEMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />

            {closingSettlement === 'KEEP_IN_DRAWER' ? (
              <p className="font-caption text-on-surface rounded-lg bg-surface-container-low px-3 py-2">
                <strong>{formatMoney(countedAmount)}</strong> stays in the drawer for the next shift.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Cash taken out of drawer"
                  type="number"
                  min={0}
                  step="0.01"
                  value={transferredCash}
                  onChange={(e) => setTransferredCash(e.target.value)}
                  placeholder={actualCash}
                />

                <div className="space-y-1.5">
                  <SelectField
                    label="Send cash to"
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    options={accountOptions}
                    disabled={accountsLoading || accountOptions.length === 0}
                  />
                  {accountsLoading && (
                    <p className="font-caption text-on-surface-variant">Loading destination accounts…</p>
                  )}
                  {!accountsLoading && accountOptions.length === 0 && (
                    <p className="font-caption text-error">
                      No destination accounts found. Refresh the page and try again.
                    </p>
                  )}
                </div>
              </div>
            )}

            {closingSettlement === 'KEEP_IN_DRAWER' && (
              <div className="sr-only">
                <SelectField
                  label="Destination account"
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  options={accountOptions}
                  disabled={accountsLoading || accountOptions.length === 0}
                />
              </div>
            )}

            <Input
              label="Note (optional)"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder={
                variancePreview && variancePreview.label !== 'Balanced'
                  ? 'Why is counted cash different from expected?'
                  : 'Any note for this closing'
              }
            />
          </section>
        )}

        {error && (
          <p className="font-caption font-semibold text-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
