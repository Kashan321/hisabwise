'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { formatOrderItems } from '@/components/orders/order-badges';
import type { Order } from '@/lib/api/types';

export const DELIVERY_STATUS_VARIANT: Record<string, 'neutral' | 'preparing' | 'ready' | 'success'> = {
  ASSIGNED: 'neutral',
  PICKED_UP: 'preparing',
  OUT_FOR_DELIVERY: 'ready',
  DELIVERED: 'success',
};

export function DeliveryDetailBox({
  icon,
  label,
  children,
  className = '',
  href,
  span = 1,
}: {
  icon: string;
  label: string;
  children: ReactNode;
  className?: string;
  href?: string;
  span?: 1 | 2;
}) {
  const box = (
    <div
      className={`rounded-xl border border-outline-variant/20 bg-surface-container-low/60 p-2.5 min-w-0 ${
        span === 2 ? 'col-span-2' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon name={icon} className="text-base text-primary shrink-0" aria-hidden="true" />
        <p className="font-caption text-on-surface-variant uppercase tracking-wide text-[10px] truncate">
          {label}
        </p>
      </div>
      <div className="text-sm font-body-emphasis text-on-surface break-words line-clamp-2">
        {children}
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`block rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors ${
          span === 2 ? 'col-span-2' : ''
        }`}
      >
        {box}
      </a>
    );
  }

  return box;
}

export function DeliveryOrderSummary({
  order,
  formatMoney,
  amountLabel = 'Total',
  trailing,
}: {
  order: Order;
  formatMoney: (amount: number | string | null | undefined) => string;
  amountLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DeliveryDetailBox icon="person" label="Customer">
        {order.customerName ?? 'Walk-in'}
      </DeliveryDetailBox>

      <DeliveryDetailBox icon="shopping_bag" label="Items">
        {formatOrderItems(order)}
      </DeliveryDetailBox>

      {order.deliveryAddress && (
        <DeliveryDetailBox
          icon="location_on"
          label="Address"
          span={order.customerPhone ? 1 : 2}
        >
          {order.deliveryAddress}
        </DeliveryDetailBox>
      )}

      {order.customerPhone && (
        <DeliveryDetailBox
          icon="phone"
          label="Phone"
          span={order.deliveryAddress ? 1 : 2}
          href={`tel:${order.customerPhone.replace(/\s/g, '')}`}
        >
          <span className="text-secondary">{order.customerPhone}</span>
        </DeliveryDetailBox>
      )}

      <div className="col-span-2 flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="payments" className="text-lg text-primary shrink-0" />
          <div>
            <p className="font-caption text-on-surface-variant uppercase tracking-wide text-[10px]">
              {amountLabel}
            </p>
            <p className="font-body-emphasis text-primary text-lg leading-tight">
              {formatMoney(order.totalAmount)}
            </p>
          </div>
        </div>
        {trailing}
      </div>
    </div>
  );
}
