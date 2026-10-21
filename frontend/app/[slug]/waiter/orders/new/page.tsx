'use client';

import { Suspense, use } from 'react';
import { WaiterLayout } from '@/components/layouts/waiter-layout';
import { PosOrderScreen } from '@/components/orders/pos-order-screen';
import { Spinner } from '@/components/ui';

export default function WaiterNewOrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <WaiterLayout slug={slug} title="New Order" fullScreen>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        }
      >
        <PosOrderScreen
          slug={slug}
          waiterMode
          fullScreen
          exitHref={`/${slug}/waiter/orders`}
        />
      </Suspense>
    </WaiterLayout>
  );
}
