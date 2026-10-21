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

  useEffect(() => {
    if (!actualCash) return;
    setTransferredCash((prev) => prev || actualCash);
  }, [actualCash]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const closed = await closeShift.mutateAsync({
        shiftId: shift.id,
        actualCash: Number(actualCash) || 0,
        notes: closeNotes.trim() || undefined,
        closingSettlement,
        transferredCash: Number(transferredCash) || 0,
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

  const countedAmount = Number(actualCash) || 0;
  const variancePreview =
    expectedCash != null && actualCash
      ? formatVariance(countedAmount - Number(expectedCash), formatMoney)
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close shift"
      description="Compare the expected cash with your count, then complete the closing settlement."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={closeShift.isPending} onClick={handleSubmit}>
            Close shift
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-caption text-on-surface-variant font-bold block">
              Expected cash in drawer
            </label>
            <div
              className="flex h-11 items-center px-4 rounded-lg border border-outline-variant/30 bg-surface-container-low font-mono text-primary tabular-nums"
              aria-live="polite"
            >
              {summaryLoading ? 'Calculating…' : expectedCash != null ? formatMoney(expectedCash) : '—'}
            </div>
            <p className="font-caption text-on-surface-variant">
              What the system expects based on sales and movements.
            </p>
          </div>

          <Input
            label="Actual cash counted"
            type="number"
            min={0}
            step="0.01"
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            required
            autoFocus
          />
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

        <SelectField
          label="Final closing cash settlement"
          value={closingSettlement}
          onChange={(e) => setClosingSettlement(e.target.value as CashClosingSettlement)}
          options={CLOSING_SETTLEMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="How much cash is transferred"
            type="number"
            min={0}
            step="0.01"
            value={transferredCash}
            onChange={(e) => setTransferredCash(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <SelectField
              label="Destination account"
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              options={accountOptions}
              required
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

        <Input
          label="Notes (optional)"
          value={closeNotes}
          onChange={(e) => setCloseNotes(e.target.value)}
          placeholder="Explain any variance or settlement details"
        />

        {error && <p className="font-caption text-error">{error}</p>}
      </form>
    </Modal>
  );
}
