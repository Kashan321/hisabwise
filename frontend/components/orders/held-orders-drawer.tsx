'use client';

import Link from 'next/link';
import { Button, Icon } from '@/components/ui';
import { Drawer } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/modal';
import { formatOrderItems } from '@/components/orders/order-badges';
import { formatApiError } from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';
import { heldOrderHref } from '@/lib/order-cart';
import { formatOrderLabel } from '@/lib/order-display';
import { useSendOrderToKitchen, useUpdateOrderStatus } from '@/lib/hooks/mutations';
import { useHeldOrders } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { useToast } from '@/lib/toast';
import { useState } from 'react';

export function HeldOrdersDrawer({
  slug,
  open,
  onClose,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data, isLoading, refetch } = useHeldOrders();
  const heldOrders = data?.orders ?? [];
  const sendToKitchen = useSendOrderToKitchen();
  const updateStatus = useUpdateOrderStatus();
  const [discardTarget, setDiscardTarget] = useState<Order | null>(null);

  function handlePlace(orderId: string) {
    sendToKitchen.mutate(orderId, {
      onSuccess: () => {
        toast.success('Held order placed');
        void refetch();
      },
      onError: (err) => toast.error(formatApiError(err)),
    });
  }

  function confirmDiscard() {
    if (!discardTarget) return;
    updateStatus.mutate(
      { id: discardTarget.id, status: 'CANCELLED' },
      {
        onSuccess: () => {
          toast.success('Held order discarded');
          setDiscardTarget(null);
          void refetch();
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Held orders" footer={null}>
        <div className="space-y-3">
          {isLoading && (
            <p className="text-sm text-on-surface-variant text-center py-8">Loading held orders…</p>
          )}
          {!isLoading && heldOrders.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-8">
              No held orders. Use &quot;Hold bill&quot; on the order screen to save one for later.
            </p>
          )}
          {heldOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-body-emphasis text-sm text-on-surface truncate">
                    {order.customerName || formatOrderLabel(order)}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {order.orderType?.replace('_', ' ')}
                    {order.tableIdentifier ? ` · Table ${order.tableIdentifier}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                  Held
                </span>
              </div>
              <p className="text-xs text-on-surface-variant line-clamp-2">{formatOrderItems(order)}</p>
              {order.deliveryAddress && (
                <p className="text-[11px] font-medium text-primary rounded-md bg-primary/10 px-2 py-1 leading-snug">
                  {order.deliveryAddress}
                </p>
              )}
              <p className="font-mono text-sm font-bold text-primary">{formatMoney(order.totalAmount)}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Link href={heldOrderHref(slug, order)} onClick={onClose}>
                  <Button variant="outline" className="!h-8 !text-xs !px-2.5">
                    <Icon name="edit" className="text-base" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  className="!h-8 !text-xs !px-2.5"
                  loading={sendToKitchen.isPending && sendToKitchen.variables === order.id}
                  onClick={() => handlePlace(order.id)}
                >
                  <Icon name="check" className="text-base" />
                  Place
                </Button>
                <Button
                  variant="ghost"
                  className="!h-8 !text-xs !px-2.5 !text-error"
                  onClick={() => setDiscardTarget(order)}
                >
                  <Icon name="delete" className="text-base" />
                  Discard
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      <ConfirmDialog
        open={discardTarget !== null}
        onClose={() => setDiscardTarget(null)}
        onConfirm={confirmDiscard}
        title="Discard held order?"
        message={
          discardTarget
            ? `Remove held order for ${discardTarget.customerName || formatOrderLabel(discardTarget)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Discard"
        destructive
        loading={updateStatus.isPending}
      />
    </>
  );
}
