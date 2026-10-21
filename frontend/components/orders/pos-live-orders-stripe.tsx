'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CompleteOrderPaymentModal } from '@/components/orders/complete-order-payment-modal';
import {
  OrderRowActions,
} from '@/components/orders/order-row-actions';
import { orderActionLabel, orderNextStatus, orderServiceSummary } from '@/components/orders/order-badges';
import { Icon } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import type { Business, Order, ReceiptTemplate } from '@/lib/api/types';
import { useUpdateOrderStatus } from '@/lib/hooks/mutations';
import { usePosLiveOrders } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { formatOrderLabel, formatOrderShortLabel } from '@/lib/order-display';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';
import { printOrderReceipt } from '@/lib/print-order-receipt';
import { useToast } from '@/lib/toast';

/** Matches compact cart line cards on New Bill (`CartLineRow`). */
const POS_ORDER_CARD_CLASS =
  'rounded-xl bg-white border border-[#E6E8E8] shadow-[0_1px_3px_rgba(0,0,0,0.06)]';

/** Unpunched items saved locally — not placed / not added to order yet. */
const UNPUNCHED_DRAFT_CARD_CLASS =
  'border-2 border-amber-400 ring-1 ring-amber-400/30 bg-amber-50/50';

/** Active order / bill being edited in the POS. */
const SELECTED_ORDER_CARD_CLASS =
  'border-2 border-primary ring-2 ring-primary/50 bg-primary/5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.14)]';

export function PosLiveOrdersStripe({
  slug,
  tableMap,
  business,
  receiptTemplate,
  currency,
  selectedOrderId,
  unpunchedDraftCounts = {},
  onOrderCompleted,
  onSelectOrder,
}: {
  slug: string;
  tableMap: Record<string, string>;
  business?: Business | null;
  receiptTemplate?: ReceiptTemplate | null;
  currency: string;
  selectedOrderId?: string | null;
  /** Unpunched add-to-order cart lines per order id. */
  unpunchedDraftCounts?: Record<string, number>;
  /** After payment + mark completed (e.g. Deliver on READY). */
  onOrderCompleted?: (order: Order) => void;
  onSelectOrder?: (order: Order) => void;
}) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data, isLoading } = usePosLiveOrders();
  const updateStatus = useUpdateOrderStatus();

  const [busy, setBusy] = useState<{ orderId: string; type: 'print' } | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    orderId: string;
    total: number;
    label: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const orders = useMemo(
    () =>
      (data?.orders ?? [])
        .filter((o) => !o.isDraft)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [data?.orders],
  );

  const newestOrderId = orders[orders.length - 1]?.id;

  const scrollCardIntoView = useCallback((orderId: string, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(`[data-order-id="${orderId}"]`);
    card?.scrollIntoView({ behavior, inline: 'nearest', block: 'nearest' });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || orders.length === 0) return;
    if (selectedOrderId) {
      scrollCardIntoView(selectedOrderId, 'smooth');
      return;
    }
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [newestOrderId, orders.length, selectedOrderId, scrollCardIntoView]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      el.scrollLeft += delta;
      event.preventDefault();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function tableLabel(order: Order) {
    if (order.tableIdentifier) return order.tableIdentifier;
    return order.tableId ? tableMap[order.tableId] ?? '' : '';
  }

  function handlePrint(order: Order) {
    setBusy({ orderId: order.id, type: 'print' });
    try {
      printOrderReceipt(order, {
        tableLabel: tableLabel(order) || '—',
        businessName: business?.name,
        businessLocation: business?.location,
        businessPhone: business?.phone,
        businessLogoUrl: business?.logoUrl,
        copyType: 'customer',
        currency,
        receiptTemplate: receiptTemplate ?? undefined,
      });
      toast.success(`Printing bill for ${formatOrderLabel(order)}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setTimeout(() => setBusy(null), 400);
    }
  }

  function advanceStatus(order: Order) {
    const next = orderNextStatus(order.status);
    if (!next) return;
    if (next === 'COMPLETED') {
      setPaymentModal({
        orderId: order.id,
        total: Number(order.totalAmount ?? 0),
        label: formatOrderLabel(order),
      });
      return;
    }
    updateStatus.mutate(
      { id: order.id, status: next },
      {
        onSuccess: () => {
          const label =
            next === 'PREPARING' ? 'Preparing' : next === 'READY' ? 'Ready' : 'Updated';
          toast.success(`Order marked as ${label}`);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function confirmCompleteWithPayment(payload: CompleteOrderPaymentPayload) {
    if (!paymentModal) return;
    updateStatus.mutate(
      {
        id: paymentModal.orderId,
        status: 'COMPLETED',
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        payments: payload.payments,
      },
      {
        onSuccess: (data) => {
          toast.success('Order completed');
          setPaymentModal(null);
          onOrderCompleted?.(data.order);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function confirmCancel() {
    if (!cancelOrderId) return;
    updateStatus.mutate(
      { id: cancelOrderId, status: 'CANCELLED' },
      {
        onSuccess: () => {
          toast.success('Order cancelled');
          setCancelOrderId(null);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  const cancelTarget = cancelOrderId
    ? orders.find((o) => o.id === cancelOrderId)
    : null;

  return (
    <>
      <section
        className="shrink-0 border-t-2 border-[#C8CCD0] bg-white shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)] z-20"
        aria-label="Open bills"
      >
        <div className="flex items-stretch gap-1 px-2 py-0.5 lg:px-2 min-h-[38px]">
          <div className="flex items-center shrink-0 pr-2 border-r border-outline-variant/15">
            <span className="text-[11px] font-bold text-on-surface-variant whitespace-nowrap">
              <span className="sm:hidden">Open ({orders.length})</span>
              <span className="hidden sm:inline">Open bills ({orders.length})</span>
            </span>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 min-w-0 overflow-x-auto hide-scrollbar flex items-center gap-2"
          >
            {isLoading && orders.length === 0 && (
              <span className="text-xs text-on-surface-variant px-2">Loading orders…</span>
            )}
            {!isLoading && orders.length === 0 && (
              <span className="text-xs text-on-surface-variant px-2">No active orders today</span>
            )}
            {orders.map((order) => {
              const action = orderActionLabel(order.status);
              const isStatusBusy =
                updateStatus.isPending && updateStatus.variables?.id === order.id;
              const isPrintBusy = busy?.orderId === order.id && busy.type === 'print';
              const table = tableLabel(order);
              const isSelected = selectedOrderId === order.id;
              const unpunchedCount = unpunchedDraftCounts[order.id] ?? 0;
              const hasUnpunchedDraft = unpunchedCount > 0;

              return (
                <article
                  key={order.id}
                  data-order-id={order.id}
                  role={onSelectOrder ? 'button' : undefined}
                  tabIndex={onSelectOrder ? 0 : undefined}
                  onClick={() => onSelectOrder?.(order)}
                  onKeyDown={(e) => {
                    if (!onSelectOrder) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectOrder(order);
                    }
                  }}
                  className={`shrink-0 w-[min(220px,72vw)] sm:w-[232px] px-1.5 py-1 flex flex-col gap-0.5 transition-all ${POS_ORDER_CARD_CLASS} ${
                    onSelectOrder ? 'cursor-pointer hover:shadow-md' : ''
                  } ${hasUnpunchedDraft && !isSelected ? UNPUNCHED_DRAFT_CARD_CLASS : ''} ${
                    isSelected ? SELECTED_ORDER_CARD_CLASS : ''
                  } ${hasUnpunchedDraft && isSelected ? 'bg-amber-50/35' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1.5 min-w-0 leading-tight">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        {hasUnpunchedDraft && (
                          <span
                            className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-900 border border-amber-200/80"
                            title={`${unpunchedCount} item(s) not punched yet`}
                          >
                            <Icon name="edit_note" className="text-[12px]" />
                          </span>
                        )}
                        <span
                          className="font-mono text-sm font-bold text-primary truncate"
                          title={formatOrderLabel(order)}
                        >
                          {formatOrderShortLabel(order)}
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                        {orderServiceSummary(
                          order,
                          table ? `Table ${table}` : undefined,
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-on-surface-variant/90 capitalize">
                        {order.status.replace(/_/g, ' ').toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xl sm:text-2xl font-mono font-bold text-primary tabular-nums shrink-0 leading-none">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <OrderRowActions
                      slug={slug}
                      order={order}
                      statusAction={action}
                      isStatusBusy={isStatusBusy}
                      isPrintBusy={isPrintBusy}
                      onView={() => undefined}
                      hideView
                      dense
                      onPrint={() => handlePrint(order)}
                      onAdvanceStatus={() => advanceStatus(order)}
                      onCancel={() => setCancelOrderId(order.id)}
                      compact
                      labeledActions
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <Link
            href={`/${slug}/orders`}
            className="shrink-0 self-center flex items-center gap-0.5 text-[11px] font-semibold text-secondary hover:underline px-1"
          >
            All
            <Icon name="chevron_right" className="text-base" />
          </Link>
        </div>
      </section>

      <ConfirmDialog
        open={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        title="Cancel order?"
        message={
          cancelTarget
            ? `Are you sure you want to cancel ${formatOrderLabel(cancelTarget)}? This cannot be undone.`
            : 'Are you sure you want to cancel this order? This cannot be undone.'
        }
        confirmLabel="Cancel order"
        destructive
        loading={updateStatus.isPending && updateStatus.variables?.id === cancelOrderId}
        onConfirm={confirmCancel}
      />

      <CompleteOrderPaymentModal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        orderLabel={paymentModal?.label ?? ''}
        totalAmount={paymentModal?.total ?? 0}
        loading={updateStatus.isPending}
        onConfirm={confirmCompleteWithPayment}
      />
    </>
  );
}
