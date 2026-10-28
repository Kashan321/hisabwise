'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { POS_TERMINAL_ENABLED } from '@/lib/feature-flags';
import { CashierTerminalScreen } from '@/components/orders/cashier-terminal-screen';

export default function CashierTerminalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (!POS_TERMINAL_ENABLED) {
      router.replace(`/${slug}/dashboard`);
    }
  }, [router, slug]);

  if (!POS_TERMINAL_ENABLED) {
    return null;
  }

  return (
    <BusinessLayout slug={slug} title="Terminal" hideFab noPadding fullBleed showHeaderTitle={false}>
      <CashierTerminalScreen slug={slug} />
    </BusinessLayout>
  );
}
