'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';

export function ReportsButton({ slug }: { slug: string }) {
  return (
    <Link
      href={`/${slug}/reports`}
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-100 tap-target sm:px-2.5 sm:text-xs"
      aria-label="Open reports"
    >
      <Icon name="analytics" className="text-sm" />
      <span className="hidden sm:inline">Reports</span>
    </Link>
  );
}
