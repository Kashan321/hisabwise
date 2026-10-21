'use client';

import { use, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import {
  formatVariance,
  MovementFeed,
  shiftDurationLabel,
  ShiftMetricCard,
} from '@/components/cash-shift/shift-shared';
import { Button, Icon, Spinner } from '@/components/ui';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { closingSettlementLabel } from '@/lib/cash-shift/closing-settlement';
import { printShiftCloseReport } from '@/lib/print-shift-close-report';
import type { CashShift } from '@/lib/api/types';
import { useBusiness, useCashShiftSummary, useCashShifts, useReceiptTemplate } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';

function ShiftHistoryRow({
  shift,
  expanded,
  onToggle,
}: {
  shift: CashShift;
  expanded: boolean;
  onToggle: () => void;
}) {
  const formatMoney = useFormatMoney();
  const variance = formatVariance(shift.variance, formatMoney);
  const cashSales = shift.stats?.cashSales ?? 0;
  const expected =
    shift.status === 'CLOSED'
      ? Number(shift.expectedCash ?? shift.stats?.expectedCash ?? 0)
      : shift.stats?.expectedCash ?? 0;

  return (
    <article className="border-b border-outline-variant/10 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 md:px-5 py-4 text-left hover:bg-surface-container-low/50 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            className="text-on-surface-variant shrink-0"
          />
          <div className="flex-1 min-w-[160px]">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-body-emphasis text-primary">{shift.openedByName}</p>
              {shift.status === 'OPEN' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-container text-on-primary-container">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="font-caption text-on-surface-variant mt-0.5">
              {new Date(shift.openedAt).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {shift.closedAt
                ? ` → ${new Date(shift.closedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                : ` · ${shiftDurationLabel(shift.openedAt)}`}
            </p>
            {shift.status === 'CLOSED' && shift.closingSettlement && (
              <p className="font-caption text-on-surface-variant mt-1">
                {closingSettlementLabel(shift.closingSettlement)}
                {shift.transferredCash != null && ` · ${formatMoney(shift.transferredCash)} transferred`}
                {shift.destinationAccountName && ` → ${shift.destinationAccountName}`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 font-caption ml-8 md:ml-0">
            <div>
              <p className="text-on-surface-variant text-[10px] uppercase tracking-wider">Float</p>
              <p className="font-mono text-primary tabular-nums">{formatMoney(shift.openingCash)}</p>
            </div>
            <div>
              <p className="text-on-surface-variant text-[10px] uppercase tracking-wider">Sales</p>
              <p className="font-mono text-primary tabular-nums">{formatMoney(cashSales)}</p>
            </div>
            <div>
              <p className="text-on-surface-variant text-[10px] uppercase tracking-wider">Expected</p>
              <p className="font-mono text-primary tabular-nums">{formatMoney(expected)}</p>
            </div>
            {shift.status === 'CLOSED' && (
              <div>
                <p className="text-on-surface-variant text-[10px] uppercase tracking-wider">Variance</p>
                <span
                  className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${variance.className}`}
                >
                  {variance.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 md:px-5 pb-5">
          <ShiftAuditDetail shiftId={shift.id} />
        </div>
      )}
    </article>
  );
}

function ShiftSettlementDetail({
  shift,
  formatMoney,
}: {
  shift: CashShift;
  formatMoney: (value: number | string | null | undefined) => string;
}) {
  if (shift.status !== 'CLOSED' || !shift.closingSettlement) return null;

  const actual = Number(shift.actualCash ?? 0);
  const transferred = Number(shift.transferredCash ?? 0);
  const remainingInDrawer = Math.max(0, Math.round((actual - transferred) * 100) / 100);

  return (
    <div className="p-4 border-b border-outline-variant/10 bg-surface-container-lowest/60">
      <h4 className="font-body-emphasis text-primary mb-3 flex items-center gap-2">
        <Icon name="account_balance" className="text-base" />
        Closing settlement
      </h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 font-caption">
        <div>
          <p className="text-on-surface-variant">Settlement</p>
          <p className="text-primary mt-0.5 font-body-emphasis">
            {closingSettlementLabel(shift.closingSettlement)}
          </p>
        </div>
        <div>
          <p className="text-on-surface-variant">Transferred</p>
          <p className="font-mono text-primary mt-0.5">{formatMoney(transferred)}</p>
          {shift.destinationAccountName && (
            <p className="text-on-surface-variant mt-0.5">→ {shift.destinationAccountName}</p>
          )}
        </div>
        {remainingInDrawer > 0 && (
          <div>
            <p className="text-on-surface-variant">Remaining in drawer</p>
            <p className="font-mono text-primary mt-0.5">{formatMoney(remainingInDrawer)}</p>
          </div>
        )}
        {shift.closedByName && (
          <div>
            <p className="text-on-surface-variant">Closed by</p>
            <p className="text-primary mt-0.5">{shift.closedByName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ShiftAuditDetail({ shiftId }: { shiftId: string }) {
  const formatMoney = useFormatMoney();
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();
  const { data, isLoading } = useCashShiftSummary(shiftId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6 text-center">
        <Spinner />
      </div>
    );
  }
  if (!data) return null;

  const { summary, shift } = data;

  function handlePrint() {
    if (shift.status !== 'CLOSED') return;
    printShiftCloseReport({
      shift,
      summary,
      businessName: business?.name,
      businessLocation: business?.location,
      formatMoney,
      widthMm: receiptTemplate?.receiptWidthMm ?? 80,
    });
  }

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden">
      <ShiftSettlementDetail shift={shift} formatMoney={formatMoney} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 border-b border-outline-variant/10">
        <div className="font-caption">
          <p className="text-on-surface-variant">Opening float</p>
          <p className="font-mono text-primary mt-0.5">{formatMoney(summary.openingCash)}</p>
        </div>
        <div className="font-caption">
          <p className="text-on-surface-variant">Cash sales</p>
          <p className="font-mono text-primary mt-0.5">{formatMoney(summary.cashSales)}</p>
        </div>
        <div className="font-caption">
          <p className="text-on-surface-variant">Added / removed</p>
          <p className="font-mono text-primary mt-0.5">
            +{formatMoney(summary.payIn)} / −{formatMoney(summary.payOut)}
          </p>
        </div>
        <div className="font-caption">
          <p className="text-on-surface-variant">Refunds</p>
          <p className="font-mono text-secondary mt-0.5">{formatMoney(summary.cashRefunds)}</p>
        </div>
        {shift.status === 'CLOSED' && (
          <>
            <div className="font-caption">
              <p className="text-on-surface-variant">Actual counted</p>
              <p className="font-mono text-primary mt-0.5">{formatMoney(shift.actualCash ?? 0)}</p>
            </div>
            <div className="font-caption">
              <p className="text-on-surface-variant">Expected</p>
              <p className="font-mono text-primary mt-0.5">{formatMoney(summary.expectedCash)}</p>
            </div>
          </>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h4 className="font-body-emphasis text-primary">Audit trail</h4>
          {shift.status === 'CLOSED' && (
            <Button variant="outline" className="text-sm" onClick={handlePrint}>
              <Icon name="print" className="text-base" />
              Print closing report
            </Button>
          )}
        </div>
        <MovementFeed movements={shift.movements ?? []} formatMoney={formatMoney} />
        {shift.notes && (
          <p className="font-caption text-on-surface-variant mt-4 pt-4 border-t border-outline-variant/10">
            <span className="font-body-emphasis text-on-surface">Close notes: </span>
            {shift.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ShiftsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const formatMoney = useFormatMoney();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: activeShifts = [], isLoading: activeLoading } = useCashShifts({
    status: 'OPEN',
    limit: 10,
  });
  const { data: closedShifts = [], isLoading: closedLoading } = useCashShifts({
    status: 'CLOSED',
    limit: 50,
  });

  const totalSalesClosed = closedShifts.reduce((sum, s) => sum + (s.stats?.cashSales ?? 0), 0);
  const totalVariance = closedShifts.reduce((sum, s) => sum + Number(s.variance ?? 0), 0);

  return (
    <BusinessLayout slug={slug} title="Shift History" hideFab showHeaderTitle={false}>
      <PageHeader
        icon="schedule"
        title="Shift oversight"
        description="Owner and manager view — monitor live shifts, reconciliation, and cash adjustments."
      />

      {/* Summary strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ShiftMetricCard
          icon="radio_button_checked"
          label="Active now"
          value={activeLoading ? '…' : String(activeShifts.length)}
          sub={activeShifts[0] ? `${activeShifts[0].openedByName} on duty` : 'No open shift'}
          highlight={activeShifts.length > 0}
        />
        <ShiftMetricCard
          icon="history"
          label="Closed shifts"
          value={closedLoading ? '…' : String(closedShifts.length)}
          sub="Last 50 shown"
        />
        <ShiftMetricCard
          icon="payments"
          label="Cash sales (closed)"
          value={closedLoading ? '…' : formatMoney(totalSalesClosed)}
        />
        <ShiftMetricCard
          icon="balance"
          label="Net variance"
          value={closedLoading ? '…' : formatMoney(totalVariance)}
          sub="Across closed shifts shown"
        />
      </section>

      {/* Active */}
      <section className="mb-8">
        <h2 className="font-body-emphasis text-primary mb-3 flex items-center gap-2">
          <Icon name="point_of_sale" className="text-lg" />
          Active shifts
        </h2>
        {activeLoading ? (
          <Spinner />
        ) : activeShifts.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-8">
            <EmptyState
              icon="point_of_sale"
              title="No cashier on duty"
              description="When someone opens the cash drawer, their live shift appears here."
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeShifts.map((shift) => (
              <div
                key={shift.id}
                className="rounded-2xl border border-primary/20 bg-surface-container-lowest overflow-hidden card-hairline"
              >
                <div className="h-1 bg-gradient-to-r from-primary to-[#3d8a7e]" />
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-body-emphasis text-lg text-primary">{shift.openedByName}</p>
                      <p className="font-caption text-on-surface-variant mt-0.5">
                        Since {new Date(shift.openedAt).toLocaleTimeString()} ·{' '}
                        {shiftDurationLabel(shift.openedAt)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-primary-container text-on-primary-container">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Live
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-caption">
                    <div className="rounded-xl bg-surface-container-low p-3">
                      <p className="text-on-surface-variant text-[10px] uppercase">Float</p>
                      <p className="font-mono text-primary mt-1">{formatMoney(shift.openingCash)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-container-low p-3">
                      <p className="text-on-surface-variant text-[10px] uppercase">Cash sales</p>
                      <p className="font-mono text-primary mt-1">
                        {formatMoney(shift.stats?.cashSales ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container-low p-3">
                      <p className="text-on-surface-variant text-[10px] uppercase">Expected</p>
                      <p className="font-mono text-primary mt-1">
                        {formatMoney(shift.stats?.expectedCash ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container-low p-3">
                      <p className="text-on-surface-variant text-[10px] uppercase">Adjustments</p>
                      <p className="font-mono text-on-surface mt-1 text-sm">
                        +{formatMoney(shift.stats?.payIn ?? 0)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setExpandedId((id) => (id === shift.id ? null : shift.id))}
                  >
                    {expandedId === shift.id ? 'Hide audit trail' : 'View audit trail'}
                  </Button>
                  {expandedId === shift.id && (
                    <ShiftAuditDetail shiftId={shift.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="font-body-emphasis text-primary mb-3 flex items-center gap-2">
          <Icon name="history" className="text-lg" />
          Past shifts
        </h2>
        {closedLoading ? (
          <Spinner />
        ) : closedShifts.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-8">
            <EmptyState
              icon="history"
              title="No closed shifts yet"
              description="Reconciliation details appear here after cashiers close their shifts."
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden card-hairline">
            {closedShifts.map((shift) => (
              <ShiftHistoryRow
                key={shift.id}
                shift={shift}
                expanded={expandedId === shift.id}
                onToggle={() => setExpandedId((id) => (id === shift.id ? null : shift.id))}
              />
            ))}
          </div>
        )}
      </section>

      <p className="font-caption text-on-surface-variant mt-6 text-center max-w-xl mx-auto">
        Access: owners and managers with Reports or full admin rights. Cashiers can use the drawer
        but cannot open this page.
      </p>
    </BusinessLayout>
  );
}
