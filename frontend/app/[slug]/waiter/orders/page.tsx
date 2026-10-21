'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { WaiterLayout } from '@/components/layouts/waiter-layout';
import { Button, StatusChip, orderStatusVariant } from '@/components/ui';
import { formatOrderItems } from '@/components/orders/order-badges';
import { ConfirmDialog } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import { useCreateChangeRequest, useSendOrderToKitchen } from '@/lib/hooks/mutations';
import { useWaiterOrders } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';
import { useToast } from '@/lib/toast';
import { formatOrderLabel, orderTakerName } from '@/lib/order-display';

export default function WaiterOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: orders = [], isLoading } = useWaiterOrders();
  const sendToKitchen = useSendOrderToKitchen();
  const createChangeRequest = useCreateChangeRequest();
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  function handleSendToKitchen(orderId: string) {
    sendToKitchen.mutate(orderId, {
      onSuccess: () => toast.success('Order sent to kitchen'),
      onError: (err) => toast.error(formatApiError(err)),
    });
  }

  function handleCancelRequest() {
    if (!cancelOrderId) return;
    createChangeRequest.mutate(
      {
        orderId: cancelOrderId,
        type: 'CANCEL_ORDER',
        reason: 'Requested by waiter',
      },
      {
        onSuccess: () => {
          toast.success('Cancellation request submitted');
          setCancelOrderId(null);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  return (
    <WaiterLayout slug={slug} title="My Orders">
      {isLoading ? (
        <p className="text-on-surface-variant">Loading orders...</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isDraft = order.isDraft || !order.sentToKitchenAt;
            const canCancel =
              !isDraft && !['COMPLETED', 'CANCELLED'].includes(order.status);
            const canAddItems = canAddItemsToOpenTab(order);

            return (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-body-emphasis">{formatOrderLabel(order)}</p>
                    <p className="font-caption text-on-surface-variant">
                      {order.tableIdentifier ?? order.orderType?.replace('_', ' ') ?? 'Order'}
                      {orderTakerName(order) ? ` · ${orderTakerName(order)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusChip label={order.status} variant={orderStatusVariant(order.status)} />
                    {isDraft && <StatusChip label="DRAFT" variant="neutral" />}
                  </div>
                </div>

                <p className="font-caption text-on-surface-variant">{formatOrderItems(order)}</p>
                <p className="font-body-emphasis text-primary">{formatMoney(order.totalAmount)}</p>

                <div className="flex flex-wrap gap-2">
                  {canAddItems && (
                    <Link href={posAddItemsHref(slug, order, 'waiter/orders')}>
                      <Button variant="secondary" type="button">
                        {isDraft ? 'Edit draft' : 'Add items'}
                      </Button>
                    </Link>
                  )}
                  {isDraft && (
                    <Button
                      variant="primary"
                      type="button"
                      loading={sendToKitchen.isPending && sendToKitchen.variables === order.id}
                      onClick={() => void handleSendToKitchen(order.id)}
                    >
                      Send to kitchen
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCancelOrderId(order.id)}
                    >
                      Request cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {!orders.length && (
            <div className="text-center py-12">
              <p className="font-body-emphasis text-on-surface-variant">No orders yet</p>
              <p className="font-caption text-on-surface-variant mt-1">
                Create a new order from the New tab.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirm={() => void handleCancelRequest()}
        title="Request cancellation?"
        message="A manager must approve this request before the order is cancelled."
        confirmLabel="Submit request"
        loading={createChangeRequest.isPending}
        destructive
      />
    </WaiterLayout>
  );
}
