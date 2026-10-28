'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CompleteOrderPaymentModal } from '@/components/orders/complete-order-payment-modal';
import { Button, Icon, Input, Skeleton } from '@/components/ui';
import { ConfirmDialog, Drawer, Modal } from '@/components/ui/modal';
import type { FloorPlan, FloorTable, Order } from '@/lib/api/types';
import {
  buildActiveOrderByTable,
  CASHIER_STATUS_BADGE_CLASS,
  CASHIER_STATUS_CARD_CLASS,
  CASHIER_STATUS_LABEL,
  floorHeaderStats,
  formatMinutesSeated,
  normalizeTableIdentifier,
  resolveCashierTableStatus,
  type CashierTableStatus,
} from '@/lib/floor-cashier/table-display';
import {
  useDeleteTable,
  useFreeTable,
  useMergeOrders,
  useTransferOrderTable,
  useUpdateOrderStatus,
} from '@/lib/hooks/mutations';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { useOrder } from '@/lib/hooks/queries';
import { formatApiError } from '@/lib/api/errors';
import { formatOrderLabel } from '@/lib/order-display';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';
import { printOrderReceipt } from '@/lib/print-order-receipt';
import { receiptPrintPhoneOptions } from '@/lib/business-phones';
import { useBusiness, useReceiptTemplate } from '@/lib/hooks/queries';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';
import { useToast } from '@/lib/toast';

const MIN_TAP = 'min-h-14';

function TableCardSkeleton() {
  return <Skeleton className="h-36 w-full rounded-2xl" />;
}

function CashierTableCard({
  table,
  order,
  onClick,
}: {
  table: FloorTable;
  order?: Order | null;
  onClick: () => void;
}) {
  const formatMoney = useFormatMoney();
  const status = resolveCashierTableStatus(table, order);
  const name = normalizeTableIdentifier(table.tableIdentifier);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border-2 p-4 text-left transition active:scale-[0.98] ${MIN_TAP} ${CASHIER_STATUS_CARD_CLASS[status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl font-black tracking-tight">{name}</span>
        <span
          className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${CASHIER_STATUS_BADGE_CLASS[status]}`}
        >
          {CASHIER_STATUS_LABEL[status]}
        </span>
      </div>
      <div className="mt-3 text-sm font-semibold opacity-90">
        {table.capacity} seats
        {order && (status === 'busy' || status === 'bill_printed') ? (
          <>
            <span className="mx-2">·</span>
            {formatMinutesSeated(order.createdAt)}
          </>
        ) : null}
      </div>
      {order && (status === 'busy' || status === 'bill_printed') ? (
        <div className="mt-2 text-2xl font-black tabular-nums">{formatMoney(order.totalAmount)}</div>
      ) : null}
    </button>
  );
}

export function CashierFloorScreen({
  slug,
  plans,
  activePlanId,
  onActivePlanChange,
  tables,
  orders,
  isLoading,
  canEditLayout,
  onEditLayout,
  onAddTable,
}: {
  slug: string;
  plans: FloorPlan[];
  activePlanId: string | null;
  onActivePlanChange: (id: string) => void;
  tables: FloorTable[];
  orders: Order[];
  isLoading: boolean;
  canEditLayout: boolean;
  onEditLayout: () => void;
  onAddTable: () => void;
}) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();
  const transferTable = useTransferOrderTable();
  const mergeOrders = useMergeOrders();
  const freeTable = useFreeTable();
  const deleteTable = useDeleteTable();
  const updateStatus = useUpdateOrderStatus();

  const activeOrderByTable = useMemo(() => buildActiveOrderByTable(orders), [orders]);
  const stats = useMemo(
    () => floorHeaderStats(tables, activeOrderByTable),
    [tables, activeOrderByTable],
  );

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.level - b.level),
    [plans],
  );

  const sortedTables = useMemo(
    () =>
      [...tables].sort((a, b) =>
        normalizeTableIdentifier(a.tableIdentifier).localeCompare(
          normalizeTableIdentifier(b.tableIdentifier),
          undefined,
          { numeric: true },
        ),
      ),
    [tables],
  );

  const [sheetTable, setSheetTable] = useState<FloorTable | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [transferPick, setTransferPick] = useState(false);
  const [mergePick, setMergePick] = useState(false);
  const [confirmFree, setConfirmFree] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [removeListOpen, setRemoveListOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FloorTable | null>(null);

  const sheetOrder = sheetTable ? activeOrderByTable[sheetTable.id] : undefined;
  const { data: orderDetail } = useOrder(sheetOrder?.id ?? '');
  const order = orderDetail ?? sheetOrder;

  const filteredTables = sortedTables.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return normalizeTableIdentifier(t.tableIdentifier).toLowerCase().includes(q);
  });

  function handleTableTap(table: FloorTable) {
    const orderOnTable = activeOrderByTable[table.id];
    const status = resolveCashierTableStatus(table, orderOnTable);
    if (status === 'free') {
      window.location.href = `/${slug}/orders/new?tableId=${table.id}&dineIn=1`;
      return;
    }
    if (status === 'reserved') {
      toast.success('This table is reserved.');
      return;
    }
    setSheetTable(table);
    setMoreOpen(false);
    setTransferPick(false);
    setMergePick(false);
  }

  function handlePrintBill() {
    if (!order || !sheetTable) return;
    try {
      printOrderReceipt(order, {
        tableLabel: normalizeTableIdentifier(sheetTable.tableIdentifier),
        businessName: business?.name,
        businessLocation: business?.location,
        ...receiptPrintPhoneOptions(business),
        businessLogoUrl: business?.logoUrl,
        copyType: 'customer',
        currency: business?.currency ?? undefined,
        receiptTemplate,
      });
      updateStatus.mutate(
        { id: order.id, status: 'READY' },
        {
          onSuccess: () => toast.success('Bill printed'),
          onError: (err) => toast.error(formatApiError(err)),
        },
      );
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  function confirmPayment(payload: CompleteOrderPaymentPayload) {
    if (!order) return;
    updateStatus.mutate(
      { id: order.id, status: 'COMPLETED', ...payload },
      {
        onSuccess: () => {
          toast.success('Payment recorded');
          setPaymentOpen(false);
          setSheetTable(null);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  async function doTransfer(target: FloorTable) {
    if (!order) return;
    try {
      await transferTable.mutateAsync({ orderId: order.id, targetTableId: target.id });
      toast.success(`Moved to ${normalizeTableIdentifier(target.tableIdentifier)}`);
      setSheetTable(null);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function doMerge(source: FloorTable) {
    if (!order) return;
    const sourceOrder = activeOrderByTable[source.id];
    if (!sourceOrder) return;
    try {
      await mergeOrders.mutateAsync({ targetOrderId: order.id, sourceOrderId: sourceOrder.id });
      toast.success('Tables merged');
      setSheetTable(null);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function doDeleteTable() {
    if (!deleteTarget || !activePlanId) return;
    if (activeOrderByTable[deleteTarget.id]) {
      toast.error('Close or move the open bill before removing this table.');
      return;
    }
    try {
      await deleteTable.mutateAsync({ id: deleteTarget.id, floorPlanId: activePlanId });
      toast.success(`${normalizeTableIdentifier(deleteTarget.tableIdentifier)} removed`);
      setDeleteTarget(null);
      setRemoveListOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function doFreeTable() {
    if (!sheetTable) return;
    try {
      await freeTable.mutateAsync(sheetTable.id);
      toast.success('Table is free');
      setConfirmFree(false);
      setSheetTable(null);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  const freeTargets = sortedTables.filter((t) => {
    if (!sheetTable || t.id === sheetTable.id) return false;
    return resolveCashierTableStatus(t, activeOrderByTable[t.id]) === 'free';
  });

  const busyMergeTargets = sortedTables.filter((t) => {
    if (!sheetTable || t.id === sheetTable.id) return false;
    const st = resolveCashierTableStatus(t, activeOrderByTable[t.id]);
    return (st === 'busy' || st === 'bill_printed') && activeOrderByTable[t.id];
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 md:px-8 py-5">
      <section className="bg-surface rounded-2xl p-4 sm:p-6 border border-outline-variant/25 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">Tables</h1>
            <p className="mt-1 text-base font-medium text-on-surface-variant">
              <strong className="text-on-surface">{stats.busyCount}</strong> of{' '}
              <strong className="text-on-surface">{stats.totalTables}</strong> tables busy
              <span className="mx-2">·</span>
              <strong className="text-primary">{formatMoney(stats.openBillTotal)}</strong> open
              dine-in bills
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              dense
              className="!h-14 !text-base min-w-[10rem]"
              placeholder="Find table…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Find table"
            />
            {canEditLayout ? (
              <>
                <Button type="button" variant="outline" className={MIN_TAP} onClick={onAddTable}>
                  <Icon name="add" />
                  Add table
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`${MIN_TAP} !border-error/40 !text-error`}
                  onClick={() => setRemoveListOpen(true)}
                >
                  <Icon name="delete" />
                  Remove table
                </Button>
                <Button type="button" variant="ghost" className={MIN_TAP} onClick={onEditLayout}>
                  <Icon name="edit" />
                  Edit layout
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {sortedPlans.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedPlans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onActivePlanChange(p.id)}
                className={`shrink-0 px-4 ${MIN_TAP} rounded-xl text-sm font-bold border ${
                  p.id === activePlanId
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface border-outline-variant/40'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <TableCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <p className="text-center py-12 text-on-surface-variant">No tables in this area.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredTables.map((table) => (
              <CashierTableCard
                key={table.id}
                table={table}
                order={activeOrderByTable[table.id]}
                onClick={() => handleTableTap(table)}
              />
            ))}
          </div>
        )}
      </section>

      <Drawer
        open={!!sheetTable}
        onClose={() => setSheetTable(null)}
        title={sheetTable ? `Table ${normalizeTableIdentifier(sheetTable.tableIdentifier)}` : ''}
        width="lg"
      >
        {order && sheetTable ? (
          <div className="space-y-4 pb-4">
            <p className="text-sm font-semibold text-on-surface-variant">
              {formatOrderLabel(order)} · {formatMoney(order.totalAmount)}
            </p>
            <ul className="divide-y divide-outline-variant/15 rounded-xl border border-outline-variant/20 max-h-48 overflow-y-auto">
              {(order.items ?? []).map((item) => (
                <li key={item.id} className="flex justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    {item.quantity}× {item.menuItemName}
                  </span>
                  <span className="tabular-nums">{formatMoney(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {canAddItemsToOpenTab(order) ? (
                <Link href={posAddItemsHref(slug, order)} className="block">
                  <Button type="button" variant="secondary" className={`w-full ${MIN_TAP}`}>
                    Add items
                  </Button>
                </Link>
              ) : null}
              <Button type="button" variant="outline" className={MIN_TAP} onClick={handlePrintBill}>
                Print bill
              </Button>
              <Button
                type="button"
                variant="primary"
                className={MIN_TAP}
                onClick={() => setPaymentOpen(true)}
              >
                Pay
              </Button>
              <Button type="button" variant="ghost" className={MIN_TAP} onClick={() => setMoreOpen((o) => !o)}>
                More
              </Button>
            </div>
            {moreOpen ? (
              <div className="space-y-2 border-t pt-3">
                {!transferPick && !mergePick ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full ${MIN_TAP}`}
                      onClick={() => setTransferPick(true)}
                    >
                      Transfer table
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full ${MIN_TAP}`}
                      onClick={() => setMergePick(true)}
                    >
                      Merge tables
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full ${MIN_TAP}`}
                      onClick={() => setConfirmFree(true)}
                    >
                      Free table
                    </Button>
                  </>
                ) : null}
                {transferPick ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold">Move bill to which free table?</p>
                    {freeTargets.map((t) => (
                      <Button
                        key={t.id}
                        type="button"
                        variant="secondary"
                        className={`w-full ${MIN_TAP}`}
                        onClick={() => doTransfer(t)}
                      >
                        {normalizeTableIdentifier(t.tableIdentifier)}
                      </Button>
                    ))}
                    <Button type="button" variant="ghost" onClick={() => setTransferPick(false)}>
                      Back
                    </Button>
                  </div>
                ) : null}
                {mergePick ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold">Merge with which busy table?</p>
                    {busyMergeTargets.map((t) => (
                      <Button
                        key={t.id}
                        type="button"
                        variant="secondary"
                        className={`w-full ${MIN_TAP}`}
                        onClick={() => doMerge(t)}
                      >
                        {normalizeTableIdentifier(t.tableIdentifier)}
                      </Button>
                    ))}
                    <Button type="button" variant="ghost" onClick={() => setMergePick(false)}>
                      Back
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <CompleteOrderPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        orderLabel={order ? formatOrderLabel(order) : 'Bill'}
        totalAmount={Number(order?.totalAmount ?? 0)}
        onConfirm={confirmPayment}
      />

      <ConfirmDialog
        open={confirmFree}
        onClose={() => setConfirmFree(false)}
        title="Free this table?"
        message="Only use this when the table is empty and there is no unpaid bill."
        confirmLabel="Free table"
        onConfirm={doFreeTable}
      />

      <Modal
        open={removeListOpen}
        onClose={() => setRemoveListOpen(false)}
        title="Remove a table"
        description="Tables with an open bill cannot be removed. Take payment or transfer the bill first."
        footer={
          <Button type="button" variant="ghost" className={MIN_TAP} onClick={() => setRemoveListOpen(false)}>
            Done
          </Button>
        }
      >
        <ul className="space-y-2 max-h-[min(60vh,420px)] overflow-y-auto">
          {sortedTables.map((table) => {
            const hasBill = !!activeOrderByTable[table.id];
            const label = normalizeTableIdentifier(table.tableIdentifier);
            return (
              <li
                key={table.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/25 px-3 py-2"
              >
                <div>
                  <p className="font-bold text-lg">{label}</p>
                  <p className="text-xs text-on-surface-variant">
                    {table.capacity} seats
                    {hasBill ? ' · Open bill — remove blocked' : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={`${MIN_TAP} shrink-0 !text-error !border-error/40`}
                  disabled={hasBill || deleteTable.isPending}
                  onClick={() => setDeleteTarget(table)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove table?"
        message={
          deleteTarget
            ? `Remove ${normalizeTableIdentifier(deleteTarget.tableIdentifier)} from this floor? This cannot be undone.`
            : ''
        }
        confirmLabel="Remove table"
        destructive
        loading={deleteTable.isPending}
        onConfirm={doDeleteTable}
      />
    </div>
  );
}
