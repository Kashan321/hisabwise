'use client';

import { use } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';

export default function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <BusinessLayout slug={slug} showHeaderTitle={false}>
      <OverviewDashboard slug={slug} />
    </BusinessLayout>
  );
}
