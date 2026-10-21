'use client';

import { useEffect, useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import type { BusinessDay, BusinessDaySummary } from '@/lib/api/types';
import { useCloseBusinessDay, useOpenBusinessDay } from '@/lib/hooks/mutations';
import {
  useBusiness,
  useBusinessDaySummary,
  useCurrentBusinessDay,
  useReceiptTemplate,
} from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { printBusinessDayReport } from '@/lib/print-business-day-report';
import { useToast } from '@/lib/toast';

function formatBusinessDateLabel(businessDate: string): string {
  return new Date(`${businessDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeLabel(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BusinessDayPowerButton() {
  const { data: currentState, isLoading } = useCurrentBusinessDay();
  const day = currentState?.businessDay;
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const isOpen = Boolean(day);

  return (
    <>
      <button
        type="button"
        title={isOpen ? `Business day open · ${day?.businessDate}` : 'No business day open'}
        aria-label={isOpen ? 'Close business day' : 'Open business day'}
        disabled={isLoading}
        onClick={() => (isOpen ? setCloseModal(true) : setOpenModal(true))}
        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition-colors tap-target disabled:cursor-not-allowed sm:px-2.5 sm:text-xs ${
          isOpen
            ? 'border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-100'
            : 'border-amber-400/30 bg-amber-50 text-amber-800 hover:bg-amber-100'
        }`}
      >
        <Icon name="today" className="text-sm" />
        <span className="hidden sm:inline">{isOpen ? 'Close day' : 'Open day'}</span>
      </button>

      <BusinessDayOpenModal open={openModal} onClose={() => setOpenModal(false)} />
      {day && (
        <BusinessDayCloseModal open={closeModal} onClose={() => setCloseModal(false)} day={day} />
      )}
    </>
  );
}

function BusinessDayOpenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const openDay = useOpenBusinessDay();
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    try {
      await openDay.mutateAsync();
      toast.success('Business day opened');
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Open business day"
      description="Start the restaurant business day before taking orders or opening shifts. Order numbers reset for the new day."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={openDay.isPending} onClick={handleSubmit}>
            Open business day
          </Button>
        </>
      }
    >
      {error && <p className="text-sm text-error">{error}</p>}
    </Modal>
  );
}

function BusinessDaySummaryPanel({
  day,
  summary,
  formatMoney,
}: {
  day: BusinessDay;
  summary: BusinessDaySummary;
  formatMoney: (value: number | string | null | undefined) => string;
}) {
  const openShifts = summary.shifts.filter((shift) => shift.status === 'OPEN').length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Icon name="today" className="text-xl" />
          </div>
          <div className="min-w-0">
            <p className="font-title-lg text-primary">{formatBusinessDateLabel(day.businessDate)}</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {(day.openCount ?? 1) === 1 ? 'Opened once' : `Opened ${day.openCount} times`}
              {' · '}
              {(day.closeCount ?? 0) === 0
                ? 'Not closed yet'
                : (day.closeCount ?? 0) === 1
                  ? 'Closed once'
                  : `Closed ${day.closeCount} times`}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Last opened {formatTimeLabel(day.lastOpenedAt ?? day.startedAt)}
              {day.openedByName ? ` · ${day.openedByName}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStatCard
          icon="receipt_long"
          label="Orders"
          value={String(summary.orderCount)}
        />
        <SummaryStatCard
          icon="payments"
          label="Total sales"
          value={formatMoney(summary.totalSales)}
          emphasize
        />
        <SummaryStatCard
          icon="schedule"
          label="Shifts"
          value={String(summary.shifts.length)}
          hint={openShifts > 0 ? `${openShifts} still open` : undefined}
          hintWarning={openShifts > 0}
        />
      </div>

      {openShifts > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Icon name="warning" className="mt-0.5 shrink-0 text-base" />
          <p>Close all open cash shifts before ending the business day.</p>
        </div>
      )}

      {summary.shifts.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-outline-variant/15">
          <div className="border-b border-outline-variant/10 bg-surface-container-low px-4 py-3">
            <p className="font-semibold text-primary">Shift breakdown</p>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {summary.shifts.map((shift, index) => (
              <div
                key={shift.shiftId}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary">Shift {index + 1}</p>
                  <p className="truncate text-on-surface-variant">
                    {shift.openedByName} · {formatTimeLabel(shift.openedAt)}
                    {shift.closedAt ? ` → ${formatTimeLabel(shift.closedAt)}` : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    shift.status === 'OPEN'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {shift.status === 'OPEN' ? 'Open' : 'Closed'}
                </span>
                <div className="text-right">
                  <p className="font-mono font-semibold text-primary">{formatMoney(shift.sales)}</p>
                  <p className="text-xs text-on-surface-variant">{shift.orderCount} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-outline-variant/20 px-4 py-6 text-center text-sm text-on-surface-variant">
          No shifts recorded for this business day yet.
        </div>
      )}
    </div>
  );
}

function SummaryStatCard({
  icon,
  label,
  value,
  hint,
  hintWarning,
  emphasize,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  hintWarning?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon name={icon} className="text-base" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 font-mono ${emphasize ? 'text-xl font-bold text-primary' : 'text-lg font-semibold text-primary'}`}>
        {value}
      </p>
      {hint && (
        <p className={`mt-1 text-xs ${hintWarning ? 'font-medium text-amber-700' : 'text-on-surface-variant'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function BusinessDayCloseModal({
  open,
  onClose,
  day,
}: {
  open: boolean;
  onClose: () => void;
  day: BusinessDay;
}) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();
  const closeDay = useCloseBusinessDay();
  const { data: summary, isLoading: summaryLoading } = useBusinessDaySummary(open ? day.id : undefined);
  const [error, setError] = useState('');
  const [closedDay, setClosedDay] = useState<BusinessDay | null>(null);

  useEffect(() => {
    if (!open) {
      setClosedDay(null);
      setError('');
    }
  }, [open]);

  function handlePrint() {
    if (!summary) return;
    printBusinessDayReport({
      day: closedDay ?? day,
      summary,
      businessName: business?.name,
      businessLocation: business?.location,
      formatMoney,
      widthMm: receiptTemplate?.receiptWidthMm ?? 80,
    });
  }

  async function handleSubmit() {
    setError('');
    try {
      const result = await closeDay.mutateAsync(day.id);
      setClosedDay(result.businessDay);
      toast.success('Business day closed');
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  if (closedDay && summary) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Business day closed"
        description="Your business day has been closed successfully."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handlePrint}>
              <Icon name="print" className="text-base" />
              Print day report
            </Button>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </>
        }
      >
        <BusinessDaySummaryPanel day={closedDay} summary={summary} formatMoney={formatMoney} />
      </Modal>
    );
  }

  const openShifts = summary?.shifts.filter((shift) => shift.status === 'OPEN').length ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close business day"
      description="Review today’s totals, print the day report if needed, then close the business day."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!summary || summaryLoading}
          >
            <Icon name="print" className="text-base" />
            Print day report
          </Button>
          <Button
            variant="primary"
            loading={closeDay.isPending}
            disabled={!summary || openShifts > 0}
            onClick={handleSubmit}
          >
            Close business day
          </Button>
        </>
      }
    >
      {summaryLoading && !summary ? (
        <p className="text-sm text-on-surface-variant">Loading day summary…</p>
      ) : summary ? (
        <BusinessDaySummaryPanel day={day} summary={summary} formatMoney={formatMoney} />
      ) : null}
      {error && <p className="mt-4 text-sm text-error">{error}</p>}
    </Modal>
  );
}
