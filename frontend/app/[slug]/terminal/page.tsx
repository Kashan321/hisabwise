'use client';

import { use } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { CashierTerminalScreen } from '@/components/orders/cashier-terminal-screen';

export default function CashierTerminalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <BusinessLayout slug={slug} title="Terminal" hideFab noPadding fullBleed showHeaderTitle={false}>
      <CashierTerminalScreen slug={slug} />
    </BusinessLayout>
  );
}
