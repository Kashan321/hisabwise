'use client';

import { use, useState } from 'react';
import {
  DELIVERY_STATUS_VARIANT,
  DeliveryOrderSummary,
} from '@/components/delivery/delivery-order-summary';
import { RiderLayout } from '@/components/layouts/rider-layout';
import { PaymentMethodBadge } from '@/components/orders/order-badges';
import { Button, Icon, StatusChip } from '@/components/ui';
import { CompleteOrderPaymentModal } from '@/components/orders/complete-order-payment-modal';
import { formatApiError } from '@/lib/api/errors';
import type { DeliveryStatus, Order } from '@/lib/api/types';
import { useUpdateDeliveryStatus } from '@/lib/hooks/mutations';
import { useBusiness, useRiderDashboard, useRiderPendingCash } from '@/lib/hooks/queries';
import { useFormatMoney, useBusinessCurrency } from '@/lib/hooks/use-business-currency';
import { receiptPrintPhoneOptions } from '@/lib/business-phones';
import { usePrintBillPrompt } from '@/lib/hooks/use-print-bill-prompt';
import { formatOrderLabel } from '@/lib/order-display';
import {
  orderNeedsPaymentOnDelivery,
  type CompleteOrderPaymentPayload,
} from '@/lib/payment-methods';
import { useToast } from '@/lib/toast';

const NEXT_STATUS: Partial<Record<DeliveryStatus, { status: DeliveryStatus; label: string }>> = {
  ASSIGNED: { status: 'PICKED_UP', label: 'Picked up' },
  PICKED_UP: { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  OUT_FOR_DELIVERY: { status: 'DELIVERED', label: 'Mark delivered' },
};

export default function RiderDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: dashboard, isLoading } = useRiderDashboard();
  const { data: pendingCash } = useRiderPendingCash();
  const { data: business } = useBusiness();
  const currency = useBusinessCurrency();
  const updateStatus = useUpdateDeliveryStatus();
  const { queuePrintBillPrompt, PrintBillPrompt } = usePrintBillPrompt({
    businessName: business?.name,
    businessLocation: business?.location,
    ...receiptPrintPhoneOptions(business),
    businessLogoUrl: business?.logoUrl,
    currency,
    getTableLabel: (order) => order.tableIdentifier ?? 'Delivery',
  });

  const [paymentModal, setPaymentModal] = useState<{
    orderId: string;
    total: number;
    label: string;
  } | null>(null);

  function finishDelivery(
    orderId: string,
    deliveryStatus: DeliveryStatus,
    payment?: CompleteOrderPaymentPayload,
  ) {
    updateStatus.mutate(
      {
        orderId,
        deliveryStatus,
        ...(payment
          ? {
              paymentMethod: payment.paymentMethod,
              paymentStatus: payment.paymentStatus,
              payments: payment.payments,
            }
          : {}),
      },
      {
        onSuccess: (data) => {
          toast.success(
            deliveryStatus === 'DELIVERED' ? 'Delivery completed' : 'Delivery status updated',
          );
          if (deliveryStatus === 'DELIVERED') {
            queuePrintBillPrompt(data.order, 'order-delivered');
          }
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function handleStatusUpdate(order: Order, deliveryStatus: DeliveryStatus) {
    if (deliveryStatus === 'DELIVERED' && orderNeedsPaymentOnDelivery(order)) {
      setPaymentModal({
        orderId: order.id,
        total: Number(order.totalAmount ?? 0),
        label: `${order.customerName ?? 'Customer'} — ${formatOrderLabel(order)}`,
      });
      return;
    }
    finishDelivery(order.id, deliveryStatus);
  }

  function confirmDeliveryWithPayment(payload: CompleteOrderPaymentPayload) {
    if (!paymentModal) return;
    finishDelivery(paymentModal.orderId, 'DELIVERED', payload);
    setPaymentModal(null);
  }

  return (
    <RiderLayout slug={slug} title="My Deliveries">
      {isLoading ? (
        <p className="text-on-surface-variant">Loading deliveries...</p>
      ) : (
        <div className="space-y-6">
          {(pendingCash?.totalPending ?? 0) > 0 && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                  <Icon name="payments" className="text-xl" />
                </span>
                <div className="min-w-0">
                  <p className="font-body-emphasis text-primary">Cash to hand to cashier</p>
                  <p className="font-display-md text-secondary mt-0.5">
                    {formatMoney(pendingCash?.totalPending ?? 0)}
                  </p>
                  <p className="font-caption text-on-surface-variant mt-1">
                    Give this cash to the cashier and ask them to confirm receipt.
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {(pendingCash?.settlements ?? []).map((settlement) => (
                  <li
                    key={settlement.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 font-caption"
                  >
                    <div className="min-w-0">
                      <p className="text-on-surface truncate">
                        {settlement.orderLabel}
                        {settlement.customerName ? ` · ${settlement.customerName}` : ''}
                      </p>
                      <p className="text-on-surface-variant">
                        {new Date(settlement.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-mono text-secondary shrink-0">
                      {formatMoney(settlement.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Assigned', value: dashboard?.stats.assigned ?? 0 },
              { label: 'Picked up', value: dashboard?.stats.pickedUp ?? 0 },
              { label: 'On the way', value: dashboard?.stats.outForDelivery ?? 0 },
              { label: 'Delivered today', value: dashboard?.stats.deliveredToday ?? 0 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20"
              >
                <p className="font-caption text-on-surface-variant">{stat.label}</p>
                <p className="font-display-md text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {(dashboard?.deliveries ?? []).map((order) => {
              const status = order.deliveryStatus ?? 'ASSIGNED';
              const next = NEXT_STATUS[status];
              const collectOnDelivery = orderNeedsPaymentOnDelivery(order);

              return (
                <div
                  key={order.id}
                  className="p-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon name="receipt_long" className="text-lg" />
                      </span>
                      <p className="font-body-emphasis truncate">{formatOrderLabel(order)}</p>
                    </div>
                    <StatusChip
                      label={status}
                      variant={DELIVERY_STATUS_VARIANT[status] ?? 'neutral'}
                    />
                  </div>

                  <DeliveryOrderSummary
                    order={order}
                    formatMoney={formatMoney}
                    amountLabel="Collect"
                    trailing={
                      order.paymentMethod && !collectOnDelivery ? (
                        <PaymentMethodBadge method={order.paymentMethod} />
                      ) : undefined
                    }
                  />

                  {collectOnDelivery && next?.status === 'DELIVERED' && (
                    <p className="flex items-center gap-2 font-caption text-on-surface-variant rounded-lg bg-surface-container-low px-2.5 py-2">
                      <Icon name="info" className="text-base text-primary shrink-0" />
                      Collect payment on delivery.
                    </p>
                  )}

                  {next && (
                    <Button
                      variant="primary"
                      type="button"
                      className="w-full"
                      loading={
                        updateStatus.isPending &&
                        updateStatus.variables?.orderId === order.id
                      }
                      onClick={() => handleStatusUpdate(order, next.status)}
                    >
                      {next.label}
                    </Button>
                  )}
                </div>
              );
            })}

            {!dashboard?.deliveries?.length && (
              <div className="text-center py-12">
                <p className="font-body-emphasis text-on-surface-variant">No deliveries assigned</p>
                <p className="font-caption text-on-surface-variant mt-1">
                  New deliveries will appear here when assigned.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <CompleteOrderPaymentModal
        open={paymentModal !== null}
        onClose={() => setPaymentModal(null)}
        orderLabel={paymentModal?.label ?? 'Delivery order'}
        totalAmount={paymentModal?.total ?? 0}
        loading={
          Boolean(
            paymentModal &&
              updateStatus.isPending &&
              updateStatus.variables?.orderId === paymentModal.orderId,
          )
        }
        onConfirm={confirmDeliveryWithPayment}
      />
      {PrintBillPrompt}
    </RiderLayout>
  );
}
