'use client';

import { use } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { ReportsNav } from '@/components/reports/reports-nav';

export default function ReportsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <BusinessLayout slug={slug} hideFab>
      <div className="mb-3 md:mb-6">
        <ReportsNav slug={slug} />
      </div>
      {children}
    </BusinessLayout>
  );
}
