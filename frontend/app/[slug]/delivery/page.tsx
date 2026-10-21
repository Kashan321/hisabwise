'use client';

import { use, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import {
  DELIVERY_STATUS_VARIANT,
  DeliveryOrderSummary,
} from '@/components/delivery/delivery-order-summary';
import { PaymentMethodBadge } from '@/components/orders/order-badges';
import { Button, Icon, SelectField, StatusChip } from '@/components/ui';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import { formatOrderLabel } from '@/lib/order-display';
import { useAssignRider } from '@/lib/hooks/mutations';
import { useDeliveryOrders, useRiders } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { orderNeedsPaymentOnDelivery } from '@/lib/payment-methods';
import { useToast } from '@/lib/toast';

export default function DeliveryManagementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: orders = [], isLoading } = useDeliveryOrders();
  const { data: riders = [] } = useRiders();
  const assignRider = useAssignRider();
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({});

  function handleAssign(orderId: string) {
    const riderId = selectedRider[orderId];
    if (!riderId) {
      toast.error('Select a rider first');
      return;
    }
    assignRider.mutate(
      { orderId, riderId },
      {
        onSuccess: () => toast.success('Rider assigned'),
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="delivery_dining"
        title="Delivery"
        description="Assign riders and track delivery orders."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="delivery_dining"
          title="No delivery orders"
          description="Delivery orders will appear here when created."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = order.deliveryStatus ?? 'UNASSIGNED';
            const collectOnDelivery = orderNeedsPaymentOnDelivery(order);

            return (
              <div
                key={order.id}
                className="app-list-card p-3 space-y-2.5"
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
                  amountLabel={collectOnDelivery ? 'Collect' : 'Total'}
                  trailing={
                    order.paymentMethod && !collectOnDelivery ? (
                      <PaymentMethodBadge method={order.paymentMethod} />
                    ) : undefined
                  }
                />

                {order.riderName ? (
                  <div className="flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/5 px-3 py-2">
                    <Icon name="two_wheeler" className="text-lg text-secondary shrink-0" />
                    <p className="font-caption text-on-surface-variant">
                      Assigned to{' '}
                      <span className="font-body-emphasis text-on-surface">{order.riderName}</span>
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end pt-0.5">
                    <div className="flex-1">
                      <SelectField
                        label="Assign rider"
                        value={selectedRider[order.id] ?? ''}
                        onChange={(e) =>
                          setSelectedRider((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        options={[
                          { value: '', label: 'Select rider' },
                          ...riders
                            .filter((r) => r.isActive)
                            .map((r) => ({ value: r.id, label: r.name })),
                        ]}
                      />
                    </div>
                    <Button
                      variant="primary"
                      type="button"
                      loading={
                        assignRider.isPending &&
                        assignRider.variables?.orderId === order.id
                      }
                      onClick={() => void handleAssign(order.id)}
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </BusinessLayout>
  );
}
