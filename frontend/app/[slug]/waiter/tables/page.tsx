'use client';

import Link from 'next/link';
import { use } from 'react';
import { WaiterLayout } from '@/components/layouts/waiter-layout';
import { Button, StatusChip } from '@/components/ui';
import { formatOrderItems } from '@/components/orders/order-badges';
import { useWaiterDashboard } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';

const TABLE_STATUS_VARIANT: Record<string, 'success' | 'neutral' | 'error' | 'preparing'> = {
  AVAILABLE: 'success',
  OCCUPIED: 'preparing',
  RESERVED: 'neutral',
  NEEDS_CLEANING: 'error',
};

export default function WaiterTablesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: dashboard, isLoading } = useWaiterDashboard();
  const formatMoney = useFormatMoney();
  const tables = dashboard?.assignedTables ?? [];

  return (
    <WaiterLayout slug={slug} title="My Tables">
      {isLoading ? (
        <p className="text-on-surface-variant">Loading tables...</p>
      ) : (
        <div className="space-y-4">
          <p className="font-caption text-on-surface-variant">
            {tables.length} table{tables.length === 1 ? '' : 's'} with your active orders
          </p>

          <div className="grid grid-cols-2 gap-3">
            {tables.map((table) => (
              <div
                key={table.id}
                className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-title-lg text-primary">{table.tableIdentifier}</span>
                  <StatusChip label={table.status} variant={TABLE_STATUS_VARIANT[table.status] ?? 'neutral'} />
                </div>
                <p className="font-caption text-on-surface-variant">{table.capacity} seats</p>

                {table.activeOrder ? (
                  <div className="mt-2 p-3 rounded-lg bg-surface-container-low border border-outline-variant/10">
                    <p className="font-caption text-secondary mb-1">Current order</p>
                    <p className="font-body-emphasis text-sm line-clamp-2">
                      {formatOrderItems(table.activeOrder)}
                    </p>
                    <p className="font-caption text-on-surface-variant mt-1">
                      {formatMoney(table.activeOrder.totalAmount)}
                    </p>
                  </div>
                ) : (
                  <p className="font-caption text-on-surface-variant mt-1">No active order</p>
                )}

                {table.activeOrder && canAddItemsToOpenTab(table.activeOrder) ? (
                  <Link
                    href={posAddItemsHref(slug, table.activeOrder, 'waiter/orders')}
                    className="mt-auto"
                  >
                    <Button variant="secondary" className="w-full" type="button">
                      {table.activeOrder.isDraft && !table.activeOrder.sentToKitchenAt
                        ? 'Edit draft'
                        : 'Add items'}
                    </Button>
                  </Link>
                ) : table.activeOrder ? (
                  <Link href={`/${slug}/waiter/orders`} className="mt-auto">
                    <Button variant="secondary" className="w-full" type="button">
                      View order
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/${slug}/waiter/orders/new?tableId=${table.id}`} className="mt-auto">
                    <Button variant="secondary" className="w-full" type="button">
                      Start order
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>

          {!tables.length && (
            <div className="text-center py-12">
              <p className="font-body-emphasis text-on-surface-variant">No active tables</p>
              <p className="font-caption text-on-surface-variant mt-1">
                Start a new order and pick a table — it will show here until the order is completed.
              </p>
            </div>
          )}
        </div>
      )}
    </WaiterLayout>
  );
}
