'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  OrderSourceBadge,
  OrderStatusBadge,
  OrderTypeBadge,
  PaymentMethodBadge,
  timeAgo,
} from '@/components/orders/order-badges';
import { Button, Icon } from '@/components/ui';
import { Drawer } from '@/components/ui/modal';
import type { Order } from '@/lib/api/types';
import { paymentMethodLabel } from '@/lib/payment-methods';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { useBusiness } from '@/lib/hooks/queries';
import { OrderTakerSelectField } from '@/components/orders/order-taker-select-field';
import { formatApiError } from '@/lib/api/errors';
import { formatOrderLabel, orderPunchedByName, orderTakerName } from '@/lib/order-display';
import {
  canAssignOrderTaker,
  EMPTY_ORDER_TAKER,
  orderTakerFromOrder,
  ORDER_TAKER_OTHER_VALUE,
  transferWaiterRequestBody,
  type OrderTakerSelection,
} from '@/lib/order-taker';
import { useAuth } from '@/lib/auth/auth-context';
import { useTransferOrderWaiter } from '@/lib/hooks/mutations';
import { useStaff } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';
import { themeToStyle } from '@/lib/theme/theme-css';

function OrderItemRow({
  item,
  formatMoney,
}: {
  item: NonNullable<Order['items']>[number];
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  return (
    <li className="flex gap-3 py-3 border-b border-outline-variant/10 last:border-0">
      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed/20 flex items-center justify-center">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon name="local_cafe" className="text-xl text-primary/25" filled />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-3">
          <p className="font-body-emphasis">
            {item.menuItemName}
            {item.isKitchenAddition && (
              <span className="ml-1.5 inline-flex items-center rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide bg-primary-container/50 text-primary border border-primary/15">
                Added
              </span>
            )}
          </p>
          <span className="font-mono shrink-0">{formatMoney(item.lineTotal)}</span>
        </div>
        <p className="font-caption text-on-surface-variant mt-0.5">
          {item.quantity} × {formatMoney(item.unitPrice)}
        </p>
        {item.variantName && (
          <p className="font-caption text-on-surface-variant mt-1">{item.variantName}</p>
        )}
        {(item.modifiers ?? []).map((mod) => (
          <p key={mod.id ?? mod.modifierName} className="font-caption text-on-surface-variant mt-1">
            + {mod.modifierName}
            {Number(mod.priceAdjustment) !== 0 && (
              <span> ({formatMoney(mod.priceAdjustment)})</span>
            )}
          </p>
        ))}
        {item.customizationNotes && (
          <p className="font-caption text-secondary mt-1">{item.customizationNotes}</p>
        )}
      </div>
    </li>
  );
}

export function OrderDetailDrawer({
  open,
  onClose,
  order,
  tableLabel,
  onPrint,
  onPreview,
  printing,
  addItemsHref,
  onOrderUpdated,
}: {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  tableLabel: string;
  onPrint: () => void;
  onPreview?: () => void;
  printing?: boolean;
  addItemsHref?: string;
  onOrderUpdated?: (order: Order) => void;
}) {
  const formatMoney = useFormatMoney();
  const { data: business } = useBusiness();
  const themeStyle = themeToStyle(business);
  const { user } = useAuth();
  const { data: staff = [], isLoading: staffLoading } = useStaff();
  const transferWaiter = useTransferOrderWaiter();
  const toast = useToast();
  const canEditTaker = canAssignOrderTaker(user);
  const [orderTaker, setOrderTaker] = useState<OrderTakerSelection>(EMPTY_ORDER_TAKER);

  useEffect(() => {
    if (!order) return;
    setOrderTaker(orderTakerFromOrder(order));
  }, [order?.id, order?.waiterId, order?.waiterName]);

  if (!order) return null;
  const orderId = order.id;

  async function persistOrderTaker(next: OrderTakerSelection) {
    const previous = orderTaker;
    setOrderTaker(next);
    try {
      const body = transferWaiterRequestBody(next);
      const data = await transferWaiter.mutateAsync({
        orderId,
        ...body,
      });
      onOrderUpdated?.(data.order);
      toast.success(body.waiterId || body.waiterName ? 'Order taker updated' : 'Order taker removed');
    } catch (err) {
      setOrderTaker(previous);
      toast.error(formatApiError(err));
    }
  }

  function handleOrderTakerChange(next: OrderTakerSelection) {
    setOrderTaker(next);
    const persistNow =
      (next.staffId && next.staffId !== ORDER_TAKER_OTHER_VALUE) ||
      (!next.staffId && !next.customName.trim());
    if (persistNow) {
      void persistOrderTaker(next);
    }
  }

  function handleCustomOrderTakerCommit(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    void persistOrderTaker({ staffId: ORDER_TAKER_OTHER_VALUE, customName: trimmed });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Order ${formatOrderLabel(order)}`}
      width="lg"
      themeStyle={themeStyle}
      footer={
        <div className="flex w-full flex-col gap-2">
          <div className={`grid w-full gap-2 ${addItemsHref ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {addItemsHref && (
              <Link href={addItemsHref} className="min-w-0">
                <Button type="button" variant="primary" className="w-full px-4">
                  <Icon name="add" className="text-lg" />
                  Add items
                </Button>
              </Link>
            )}
            <Button
              type="button"
              variant="primary"
              className="w-full px-4"
              loading={printing}
              onClick={onPrint}
            >
              <Icon name="print" className="text-lg" />
              Print receipt
            </Button>
          </div>
          <div className={`grid w-full gap-2 ${onPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {onPreview && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-primary/30 text-primary hover:bg-primary/5"
                onClick={onPreview}
              >
                <Icon name="visibility" className="text-lg" />
                Preview
              </Button>
            )}
            <Button variant="ghost" type="button" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <OrderStatusBadge status={order.status} />
          <OrderTypeBadge orderType={order.orderType} compact />
          <OrderSourceBadge source={order.source} />
          {order.status === 'COMPLETED' && order.paymentMethod && (
            <PaymentMethodBadge method={order.paymentMethod} />
          )}
        </div>

        {canEditTaker && (
          <OrderTakerSelectField
            staff={staff}
            value={orderTaker}
            loading={staffLoading || transferWaiter.isPending}
            disabled={transferWaiter.isPending}
            onChange={handleOrderTakerChange}
            onCustomNameCommit={handleCustomOrderTakerCommit}
          />
        )}

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="font-caption text-on-surface-variant uppercase">Service</dt>
            <dd className="font-body-emphasis mt-1">{tableLabel}</dd>
          </div>
          <div>
            <dt className="font-caption text-on-surface-variant uppercase">Placed</dt>
            <dd className="font-body-emphasis mt-1">{timeAgo(order.createdAt)}</dd>
          </div>
          {order.status === 'COMPLETED' && (order.payments?.length || order.paymentMethod) && (
            <div className="col-span-2">
              <dt className="font-caption text-on-surface-variant uppercase">Payment</dt>
              <dd className="mt-1 space-y-1">
                {order.paymentStatus && (
                  <p className="font-caption text-on-surface-variant capitalize">{order.paymentStatus.toLowerCase()}</p>
                )}
                {(order.payments ?? []).length > 0 ? (
                  order.payments!.map((payment) => (
                    <p key={payment.id} className="font-body-emphasis">
                      {paymentMethodLabel(payment.method)} · {formatMoney(payment.amount)}
                      {payment.referenceNumber ? ` · Ref ${payment.referenceNumber}` : ''}
                    </p>
                  ))
                ) : (
                  <p className="font-body-emphasis">{paymentMethodLabel(order.paymentMethod!)}</p>
                )}
              </dd>
            </div>
          )}
          {order.promotionTitle && (
            <div>
              <dt className="font-caption text-on-surface-variant uppercase">Promotion</dt>
              <dd className="font-body-emphasis mt-1">{order.promotionTitle}</dd>
            </div>
          )}
          {!canEditTaker && orderTakerName(order) && (
            <div>
              <dt className="font-caption text-on-surface-variant uppercase">Order taker</dt>
              <dd className="font-body-emphasis mt-1">{orderTakerName(order)}</dd>
            </div>
          )}
          {orderPunchedByName(order) && (
            <div>
              <dt className="font-caption text-on-surface-variant uppercase">Punched by</dt>
              <dd className="font-body-emphasis mt-1">{orderPunchedByName(order)}</dd>
            </div>
          )}
          {order.preparedByName && (
            <div>
              <dt className="font-caption text-on-surface-variant uppercase">Prepared by</dt>
              <dd className="font-body-emphasis mt-1">{order.preparedByName}</dd>
            </div>
          )}
          <div>
            <dt className="font-caption text-on-surface-variant uppercase">Subtotal</dt>
            <dd className="font-mono mt-1">{formatMoney(order.subtotal)}</dd>
          </div>
          {Number(order.discountAmount ?? 0) > 0 && (
            <div>
              <dt className="font-caption text-on-surface-variant uppercase">Discount</dt>
              <dd className="font-mono mt-1 text-secondary">
                −{formatMoney(order.discountAmount)}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-caption text-on-surface-variant uppercase">Tax</dt>
            <dd className="font-mono mt-1">{formatMoney(order.taxAmount ?? 0)}</dd>
          </div>
          {Number(order.serviceAmount ?? 0) > 0 && (
            <div>
              <dt className="font-caption text-on-surface-variant uppercase">Service</dt>
              <dd className="font-mono mt-1">{formatMoney(order.serviceAmount)}</dd>
            </div>
          )}
          {Number(order.deliveryAmount ?? 0) > 0 && (
            <div>
              <dt className="font-caption text-on-surface-variant uppercase">Delivery</dt>
              <dd className="font-mono mt-1">{formatMoney(order.deliveryAmount)}</dd>
            </div>
          )}
          <div>
            <dt className="font-caption text-on-surface-variant uppercase">Total</dt>
            <dd className="font-mono font-body-emphasis text-primary mt-1">
              {formatMoney(order.totalAmount)}
            </dd>
          </div>
        </dl>

        {order.notes && (
          <div>
            <h3 className="font-caption text-on-surface-variant uppercase mb-1">Notes</h3>
            <p className="font-body-base text-on-surface">{order.notes}</p>
          </div>
        )}

        <div>
          <h3 className="font-title-lg text-primary mb-3 border-b border-outline-variant/20 pb-2">
            Items
          </h3>
          <ul className="space-y-1">
            {(order.items ?? []).map((item) => (
              <OrderItemRow key={item.id} item={item} formatMoney={formatMoney} />
            ))}
          </ul>
        </div>
      </div>
    </Drawer>
  );
}
