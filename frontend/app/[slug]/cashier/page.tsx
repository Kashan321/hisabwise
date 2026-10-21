'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { ShiftCloseModal } from '@/components/cash-shift/shift-controls';
import {
  formatVariance,
  MovementFeed,
  shiftDurationLabel,
  ShiftMetricCard,
} from '@/components/cash-shift/shift-shared';
import { Button, Icon, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-context';
import { hasAnyPermission } from '@/lib/auth/permissions';
import {
  useCashDrawerMovement,
  useConfirmRiderCashHandoff,
  useOpenCashShift,
} from '@/lib/hooks/mutations';
import {
  useCashShiftSummary,
  useCurrentCashShift,
  usePendingRiderHandoffs,
} from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { useToast } from '@/lib/toast';

function formatVarianceLabel(
  variance: number,
  formatMoney: (value: number | string | null | undefined) => string,
) {
  if (variance === 0) return { text: 'Balanced — drawer matches expected cash.', tone: 'text-on-surface-variant' };
  if (variance > 0) return { text: `Over by ${formatMoney(variance)}`, tone: 'text-primary' };
  return { text: `Short by ${formatMoney(Math.abs(variance))}`, tone: 'text-error' };
}

export default function CashierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const canViewReconciliation = hasAnyPermission(user, [
    'reports.view',
    'orders.manage',
    'business.manage',
    '*',
  ]);
  const canViewShiftHistory = hasAnyPermission(user, ['reports.view', 'orders.manage', '*']);

  const { data: shift, isLoading } = useCurrentCashShift();
  const { data: summaryData, isLoading: summaryLoading } = useCashShiftSummary(shift?.id);
  const { data: riderHandoffs = [], isLoading: handoffsLoading } = usePendingRiderHandoffs();
  const openShift = useOpenCashShift();
  const addMovement = useCashDrawerMovement();
  const confirmHandoff = useConfirmRiderCashHandoff();

  const [openingCash, setOpeningCash] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'PAY_IN' | 'PAY_OUT'>('PAY_IN');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [error, setError] = useState('');

  const summary = summaryData?.summary;
  const movements = summaryData?.shift.movements ?? [];

  async function handleOpenShift(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await openShift.mutateAsync(Number(openingCash) || 0);
      toast.success('Shift opened — you can start taking payments');
      setOpeningCash('');
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleConfirmHandoff(payload: { settlementId?: string; riderId?: string }) {
    setError('');
    try {
      await confirmHandoff.mutateAsync(payload);
      toast.success('Rider cash received');
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      toast.error(message);
    }
  }

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!shift) return;
    setError('');
    try {
      await addMovement.mutateAsync({
        shiftId: shift.id,
        type: movementType,
        amount: Number(movementAmount),
        reason: movementReason.trim(),
      });
      toast.success(movementType === 'PAY_IN' ? 'Cash added' : 'Cash removed');
      setMovementOpen(false);
      setMovementAmount('');
      setMovementReason('');
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <BusinessLayout slug={slug} title="Cashier" hideFab showHeaderTitle={false}>
      <PageHeader
        icon="point_of_sale"
        title="Cash drawer"
        description="Open your shift, track cash, and close with a blind count."
        actions={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link href={`/${slug}/terminal`} className="flex-1 sm:flex-none">
              <Button variant="primary" className="w-full justify-center">
                <Icon name="point_of_sale" className="text-base" />
                POS Terminal
              </Button>
            </Link>
            {canViewShiftHistory ? (
              <Link href={`/${slug}/shifts`} className="flex-1 sm:flex-none">
                <Button variant="secondary" className="w-full justify-center">
                  <Icon name="schedule" className="text-base" />
                  Shift history
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {isLoading ? (
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-12 text-center">
          <p className="font-caption text-on-surface-variant">Loading drawer…</p>
        </div>
      ) : !shift ? (
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden card-hairline">
            <div className="bg-gradient-to-br from-primary/90 to-[#3d8a7e] px-6 py-8 text-on-primary text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-on-primary/15 flex items-center justify-center mb-4">
                <Icon name="point_of_sale" className="text-3xl" />
              </div>
              <h2 className="font-title-lg">Start your shift</h2>
              <p className="font-caption text-on-primary/80 mt-2 max-w-xs mx-auto">
                Count the cash in the drawer and enter the starting float before taking payments.
              </p>
            </div>
            <form onSubmit={handleOpenShift} className="p-6 space-y-4">
              <Input
                label="Starting float"
                type="number"
                min={0}
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
                required
              />
              {error && <p className="font-caption text-error">{error}</p>}
              <Button type="submit" variant="primary" loading={openShift.isPending} className="w-full">
                Open shift
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active shift hero */}
          <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary to-[#3d8a7e] p-5 md:p-6 text-on-primary shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-on-primary/15 border border-on-primary/20 text-[11px] font-bold uppercase tracking-wider mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  Shift active
                </div>
                <h2 className="text-xl md:text-2xl font-bold">{shift.openedByName}</h2>
                <p className="font-caption text-on-primary/75 mt-1">
                  Opened {new Date(shift.openedAt).toLocaleString()} · {shiftDurationLabel(shift.openedAt)} elapsed
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="!bg-on-primary/15 !text-on-primary !border-on-primary/25 hover:!bg-on-primary/25"
                  onClick={() => {
                    setMovementType('PAY_IN');
                    setMovementOpen(true);
                  }}
                >
                  <Icon name="add" className="text-base" />
                  Add cash
                </Button>
                <Button
                  variant="secondary"
                  className="!bg-on-primary/15 !text-on-primary !border-on-primary/25 hover:!bg-on-primary/25"
                  onClick={() => {
                    setMovementType('PAY_OUT');
                    setMovementOpen(true);
                  }}
                >
                  <Icon name="remove" className="text-base" />
                  Remove cash
                </Button>
                <Button
                  variant="primary"
                  className="!bg-on-primary !text-primary hover:!bg-on-primary/90"
                  onClick={() => setCloseOpen(true)}
                >
                  Close shift
                </Button>
              </div>
            </div>
          </section>

          {/* Metrics */}
          <section className={`grid gap-3 sm:grid-cols-2 ${canViewReconciliation ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <ShiftMetricCard
              icon="account_balance_wallet"
              label="Opening float"
              value={formatMoney(shift.openingCash)}
            />
            <ShiftMetricCard
              icon="payments"
              label="Cash sales"
              value={summaryLoading ? '…' : formatMoney(summary?.cashSales ?? 0)}
              highlight
            />
            <ShiftMetricCard
              icon="swap_horiz"
              label="Adjustments"
              value={
                summaryLoading
                  ? '…'
                  : `+${formatMoney(summary?.payIn ?? 0)} / −${formatMoney(summary?.payOut ?? 0)}`
              }
              sub={summaryLoading ? undefined : `Refunds ${formatMoney(summary?.cashRefunds ?? 0)}`}
            />
            {canViewReconciliation && (
              <ShiftMetricCard
                icon="account_balance"
                label="Expected in drawer"
                value={summaryLoading ? '…' : formatMoney(summary?.expectedCash ?? 0)}
              />
            )}
          </section>

          <div className="grid gap-5 lg:grid-cols-5">
            {/* Activity timeline */}
            <section className="lg:col-span-3 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 card-hairline">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-body-emphasis text-primary">Drawer activity</h3>
                <span className="font-caption text-on-surface-variant">{movements.length} events</span>
              </div>
              <MovementFeed movements={movements} formatMoney={formatMoney} loading={summaryLoading} />
            </section>

            {/* Rider handoffs sidebar */}
            <section className="lg:col-span-2 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 card-hairline">
              <h3 className="font-body-emphasis text-primary mb-1">Rider handoffs</h3>
              <p className="font-caption text-on-surface-variant mb-4">
                Confirm delivery cash when a rider hands it over.
              </p>
              {handoffsLoading ? (
                <p className="font-caption text-on-surface-variant">Loading…</p>
              ) : riderHandoffs.length === 0 ? (
                <EmptyState
                  icon="two_wheeler"
                  title="No pending handoffs"
                  description="Rider cash will appear here when ready to confirm."
                />
              ) : (
                <div className="space-y-3">
                  {riderHandoffs.map((group) => (
                    <div
                      key={group.riderId}
                      className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body-emphasis text-sm">{group.riderName}</p>
                        <span className="font-mono text-sm text-primary">
                          {formatMoney(group.totalPending)}
                        </span>
                      </div>
                      <p className="font-caption text-on-surface-variant">
                        {group.settlements.length} order(s) pending
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          className="flex-1 text-sm"
                          loading={confirmHandoff.isPending}
                          onClick={() => handleConfirmHandoff({ riderId: group.riderId })}
                        >
                          Confirm all
                        </Button>
                      </div>
                      <ul className="space-y-1.5 pt-1">
                        {group.settlements.map((settlement) => (
                          <li
                            key={settlement.id}
                            className="flex items-center justify-between gap-2 font-caption text-on-surface-variant"
                          >
                            <span className="truncate">{settlement.orderLabel}</span>
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-xs shrink-0"
                              loading={confirmHandoff.isPending}
                              onClick={() => handleConfirmHandoff({ settlementId: settlement.id })}
                            >
                              Confirm
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {shift && (
        <ShiftCloseModal open={closeOpen} onClose={() => setCloseOpen(false)} shift={shift} />
      )}

      <Modal
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        title={movementType === 'PAY_IN' ? 'Add cash' : 'Remove cash'}
        description="A reason is required for every drawer adjustment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setMovementOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={addMovement.isPending} onClick={handleMovement}>Save</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleMovement}>
          <Input
            label="Amount"
            type="number"
            min={0.01}
            step="0.01"
            value={movementAmount}
            onChange={(e) => setMovementAmount(e.target.value)}
            required
          />
          <Input
            label="Reason"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
            placeholder="e.g. petty cash, change exchange, vendor payment"
            required
          />
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>
    </BusinessLayout>
  );
}
