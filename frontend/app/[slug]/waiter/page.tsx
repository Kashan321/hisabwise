'use client';

import Link from 'next/link';
import { use } from 'react';
import { WaiterLayout } from '@/components/layouts/waiter-layout';
import { Button, Icon, StatusChip, orderStatusVariant } from '@/components/ui';
import { formatOrderItems } from '@/components/orders/order-badges';
import { useWaiterDashboard } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';
import { formatOrderLabel } from '@/lib/order-display';

const TABLE_STATUS_VARIANT: Record<string, 'success' | 'neutral' | 'error' | 'preparing'> = {
  AVAILABLE: 'success',
  OCCUPIED: 'preparing',
  RESERVED: 'neutral',
  NEEDS_CLEANING: 'error',
};

export default function WaiterDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: dashboard, isLoading } = useWaiterDashboard();
  const formatMoney = useFormatMoney();

  return (
    <WaiterLayout slug={slug} title="Waiter Dashboard">
      {isLoading ? (
        <p className="text-on-surface-variant">Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active orders', value: dashboard?.stats.activeOrders ?? 0, icon: 'receipt_long' },
              { label: 'Waiting kitchen', value: dashboard?.stats.waitingForKitchen ?? 0, icon: 'hourglass_top' },
              { label: 'Preparing', value: dashboard?.stats.preparing ?? 0, icon: 'skillet' },
              { label: 'Ready', value: dashboard?.stats.ready ?? 0, icon: 'check_circle' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20"
              >
                <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                  <Icon name={stat.icon} className="text-sm" />
                  <span className="font-caption">{stat.label}</span>
                </div>
                <p className="font-display-md text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-title-lg text-primary">My tables</h2>
            <Link href={`/${slug}/waiter/tables`}>
              <Button variant="ghost" type="button">
                View all
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(dashboard?.assignedTables ?? []).slice(0, 6).map((table) => (
              <div
                key={table.id}
                className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body-emphasis">{table.tableIdentifier}</span>
                  <StatusChip label={table.status} variant={TABLE_STATUS_VARIANT[table.status] ?? 'neutral'} />
                </div>
                <p className="font-caption text-on-surface-variant">{table.capacity} seats</p>
                {table.activeOrder ? (
                  <>
                    <p className="font-caption text-on-surface-variant line-clamp-1">
                      {formatOrderItems(table.activeOrder)}
                    </p>
                    <p className="font-body-emphasis text-primary text-sm">
                      {formatMoney(table.activeOrder.totalAmount)}
                    </p>
                    {canAddItemsToOpenTab(table.activeOrder) ? (
                      <Link
                        href={posAddItemsHref(slug, table.activeOrder, 'waiter/orders')}
                        className="mt-auto"
                      >
                        <Button variant="secondary" className="w-full !py-1.5 !text-xs" type="button">
                          {table.activeOrder.isDraft && !table.activeOrder.sentToKitchenAt
                            ? 'Edit draft'
                            : 'Add items'}
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/${slug}/waiter/orders`} className="mt-auto">
                        <Button variant="secondary" className="w-full !py-1.5 !text-xs" type="button">
                          View order
                        </Button>
                      </Link>
                    )}
                  </>
                ) : null}
              </div>
            ))}
            {!dashboard?.assignedTables?.length && (
              <p className="col-span-full font-caption text-on-surface-variant text-center py-6">
                No active table orders. Start a new order and select a table.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-title-lg text-primary">Ready to serve</h2>
            <Link href={`/${slug}/waiter/orders`}>
              <Button variant="ghost" type="button">
                All orders
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {(dashboard?.readyOrders ?? []).slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-body-emphasis">{formatOrderLabel(order)}</span>
                  <StatusChip label={order.status} variant={orderStatusVariant(order.status)} />
                </div>
                <p className="font-caption text-on-surface-variant line-clamp-1">
                  {formatOrderItems(order)}
                </p>
                <p className="font-body-emphasis text-primary mt-1">{formatMoney(order.totalAmount)}</p>
              </div>
            ))}
            {!dashboard?.readyOrders?.length && (
              <p className="font-caption text-on-surface-variant text-center py-6">
                No orders ready yet.
              </p>
            )}
          </div>

          <Link href={`/${slug}/waiter/orders/new`} className="block">
            <Button variant="primary" className="w-full">
              <Icon name="add" />
              New order
            </Button>
          </Link>
        </div>
      )}
    </WaiterLayout>
  );
}
