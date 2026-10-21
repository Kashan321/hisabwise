'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';

export function NewBillButton({ slug }: { slug: string }) {
  return (
    <Link
      href={`/${slug}/orders/new`}
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-container/40 px-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-container tap-target sm:px-2.5 sm:text-xs"
      aria-label="Start a new bill"
    >
      <Icon name="receipt_long" className="text-sm" />
      <span className="hidden sm:inline">New bill</span>
    </Link>
  );
}
