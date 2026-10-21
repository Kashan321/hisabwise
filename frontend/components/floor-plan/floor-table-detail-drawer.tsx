'use client';

import Link from 'next/link';
import { OrderStatusBadge, timeAgo } from '@/components/orders/order-badges';
import { statusLabel } from '@/components/floor-plan/table-node';
import { Button, Icon } from '@/components/ui';
import { Drawer } from '@/components/ui/modal';
import type { FloorTable, Order } from '@/lib/api/types';
import { useOrder } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { formatOrderLabel, orderTakerName } from '@/lib/order-display';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';

export function FloorTableDetailDrawer({
  open,
  onClose,
  table,
  slug,
  activeOrder,
  onCycleStatus,
  onMarkReady,
}: {
  open: boolean;
  onClose: () => void;
  table: FloorTable | null;
  slug: string;
  activeOrder?: Order;
  onCycleStatus: () => void;
  onMarkReady?: () => void;
}) {
  const formatMoney = useFormatMoney();
  const { data: orderDetail, isLoading: orderLoading } = useOrder(activeOrder?.id ?? '');
  const order = orderDetail ?? activeOrder;
  const taker = order ? orderTakerName(order) : null;

  if (!table) return null;

  return (
    <Drawer open={open} onClose={onClose} title={`Table ${table.tableIdentifier}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-caption text-on-surface-variant">
              {table.capacity} seats · {(table.shape ?? 'ROUND').replace(/_/g, ' ').toLowerCase()}
            </p>
          </div>
        </div>

        {activeOrder ? (
          <div className="space-y-3">
            {orderLoading && !order?.items?.length ? (
              <p className="font-caption text-on-surface-variant py-2">Loading order…</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-body-emphasis text-primary">{formatOrderLabel(order!)}</span>
                  <OrderStatusBadge status={order!.status} />
                </div>
                <p className="font-caption text-on-surface-variant">
                  {timeAgo(order!.createdAt)}
                  {taker ? ` · ${taker}` : ''}
                </p>
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/50 max-h-48 overflow-y-auto">
                  <ul className="divide-y divide-outline-variant/10">
                    {(order!.items ?? []).map((item) => (
                      <li key={item.id} className="px-3 py-2">
                        <div className="flex justify-between gap-2 font-caption">
                          <span className="text-on-surface min-w-0">
                            <span className="font-body-emphasis">{item.quantity}×</span> {item.menuItemName}
                          </span>
                          <span className="text-on-surface-variant shrink-0">
                            {formatMoney(item.lineTotal)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-outline-variant/15">
                  <span className="font-caption text-on-surface-variant">Total</span>
                  <span className="font-title-md text-primary">{formatMoney(order!.totalAmount)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {canAddItemsToOpenTab(order!) && (
                    <Link href={posAddItemsHref(slug, order!)} className="block">
                      <Button variant="secondary" className="w-full">
                        <Icon name="add" />
                        Add items
                      </Button>
                    </Link>
                  )}
                  <Link href={`/${slug}/orders`} className="block">
                    <Button variant="outline" className="w-full">
                      Open in live orders
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-caption text-on-surface-variant capitalize">{statusLabel(table.status)}</p>
            {table.status === 'NEEDS_CLEANING' && onMarkReady && (
              <Button variant="primary" className="w-full" onClick={onMarkReady}>
                Mark table ready
              </Button>
            )}
            {table.status === 'AVAILABLE' && (
              <Link href={`/${slug}/orders/new?tableId=${table.id}`} className="block">
                <Button variant="primary" className="w-full">
                  <Icon name="add" />
                  Start order
                </Button>
              </Link>
            )}
            <Button variant="outline" className="w-full" onClick={onCycleStatus}>
              Cycle status
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
