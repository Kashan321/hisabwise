'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { Icon, TableSkeleton, StatCardSkeleton, Skeleton } from '@/components/ui';
import {
  usePlatformMetrics,
  usePlatformAuditLogs,
  usePlatformBusinesses,
} from '@/lib/hooks/queries';
import type { PlatformBusiness } from '@/lib/api/types';

function KpiCard({
  label,
  value,
  icon,
  trendIcon,
  trendText,
  valueClassName = '',
}: {
  label: string;
  value: string;
  icon: string;
  trendIcon: string;
  trendText: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-surface-bright p-6 rounded-lg border-hairline flex flex-col gap-2 group hover:border-secondary transition-colors duration-300">
      <div className="flex justify-between items-start">
        <span className="text-on-surface-variant font-caption uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-surface-container rounded-lg">
          <Icon name={icon} className="text-secondary" />
        </div>
      </div>
      <div className="mt-2">
        <span className={`font-display-lg ${valueClassName}`}>{value}</span>
        <div className="flex items-center gap-1 text-on-tertiary-container mt-1">
          <Icon name={trendIcon} className="text-[16px]" />
          <span className="font-caption">{trendText}</span>
        </div>
      </div>
    </div>
  );
}

function auditStatusBadge(action: string) {
  const pending =
    action.toLowerCase().includes('pending') || action.toLowerCase().includes('disabled');
  if (pending) {
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-error-container text-on-error-container">
        PENDING
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-tertiary-fixed text-on-tertiary-fixed-variant">
      SUCCESS
    </span>
  );
}

function formatAuditResource(log: {
  targetType: string;
  targetId: string | null;
  metadata: unknown;
}) {
  const meta = log.metadata as { businessName?: string; slug?: string } | null;
  if (meta?.businessName) return meta.businessName;
  if (meta?.slug) return meta.slug;
  if (log.targetType === 'business') return log.targetId?.slice(0, 12) ?? '—';
  return log.targetType;
}

function buildOnboardingChart(businesses: PlatformBusiness[], period: 'month' | 'quarter') {
  const now = new Date();
  const bucketCount = period === 'month' ? 6 : 4;

  const buckets: { label: string; count: number; key: string }[] = [];

  if (period === 'month') {
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        count: 0,
      });
    }
    for (const b of businesses) {
      const created = new Date(b.createdAt);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const bucket = buckets.find((x) => x.key === key);
      if (bucket) bucket.count++;
    }
  } else {
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const q = Math.floor(d.getMonth() / 3) + 1;
      buckets.push({
        label: `Q${q} '${String(d.getFullYear()).slice(2)}`,
        key: `${d.getFullYear()}-Q${q}`,
        count: 0,
      });
    }
    const seen = new Set<string>();
    const unique = buckets.filter((b) => {
      if (seen.has(b.key)) return false;
      seen.add(b.key);
      return true;
    });
    buckets.length = 0;
    buckets.push(...unique.slice(-4));

    for (const b of businesses) {
      const created = new Date(b.createdAt);
      const q = Math.floor(created.getMonth() / 3) + 1;
      const key = `${created.getFullYear()}-Q${q}`;
      const bucket = buckets.find((x) => x.key === key);
      if (bucket) bucket.count++;
    }
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const peak = Math.max(...buckets.map((b) => b.count));

  return buckets.map((b) => ({
    label: b.label,
    count: b.count,
    h: b.count === 0 ? 8 : Math.max(12, Math.round((b.count / max) * 100)),
    highlight: b.count === peak && b.count > 0,
  }));
}

export default function PlatformOverviewPage() {
  const { data: metrics, isLoading: metricsLoading } = usePlatformMetrics();
  const { data: businesses = [], isLoading: businessesLoading } = usePlatformBusinesses();
  const { data: logs = [], isLoading: logsLoading } = usePlatformAuditLogs();
  const [chartPeriod, setChartPeriod] = useState<'month' | 'quarter'>('quarter');

  const chartBars = useMemo(
    () => buildOnboardingChart(businesses, chartPeriod),
    [businesses, chartPeriod],
  );

  const total = metrics?.totalBusinesses ?? 0;
  const active = metrics?.activeBusinesses ?? 0;
  const trial = metrics?.trialBusinesses ?? 0;
  const suspended = metrics?.suspendedBusinesses ?? 0;
  const totalOrders = metrics?.totalOrders ?? 0;
  const totalCustomers = metrics?.totalCustomers ?? 0;
  const platformUsers = metrics?.totalPlatformUsers ?? 0;

  const retention =
    total > 0 ? `${Math.round((active / total) * 100)}% retention rate` : 'No businesses yet';

  const statusItems = [
    {
      name: 'Active Businesses',
      detail: `${active} of ${total} tenants`,
      ok: active > 0 || total === 0,
    },
    {
      name: 'Trial Subscriptions',
      detail: `${trial} business${trial === 1 ? '' : 'es'} on trial`,
      ok: true,
    },
    {
      name: 'Suspended Accounts',
      detail: suspended > 0 ? `${suspended} require attention` : 'None suspended',
      ok: suspended === 0,
    },
    {
      name: 'Platform Users',
      detail: `${platformUsers} admin${platformUsers === 1 ? '' : 's'} · ${totalCustomers} customers`,
      ok: true,
    },
  ];

  const isLoading = metricsLoading || businessesLoading;

  return (
    <PlatformLayout title="System Overview">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total Businesses"
              value={total.toLocaleString()}
              icon="storefront"
              trendIcon="store"
              trendText={
                trial > 0
                  ? `${trial} on trial · ${suspended} suspended`
                  : `${active} active`
              }
            />
            <KpiCard
              label="Active Subscriptions"
              value={active.toLocaleString()}
              icon="subscriptions"
              trendIcon="trending_up"
              trendText={retention}
            />
            <KpiCard
              label="Total Orders"
              value={totalOrders.toLocaleString()}
              icon="receipt_long"
              trendIcon="shopping_bag"
              trendText={`${totalCustomers.toLocaleString()} customers`}
            />
            <KpiCard
              label="Platform Users"
              value={platformUsers.toLocaleString()}
              icon="group"
              trendIcon="person"
              trendText={`${totalCustomers.toLocaleString()} end customers`}
              valueClassName="text-on-tertiary-container"
            />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-bright p-6 rounded-lg border-hairline min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-title-lg text-on-surface">Business Onboarding Trend</h2>
              <p className="font-caption text-on-surface-variant">
                New tenants by {chartPeriod === 'month' ? 'month' : 'quarter'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChartPeriod('month')}
                className={`px-3 py-1 text-caption border border-outline-variant rounded-full hover:bg-surface-container transition-all cursor-pointer ${
                  chartPeriod === 'month' ? 'border-secondary text-secondary bg-secondary/5' : ''
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod('quarter')}
                className={`px-3 py-1 text-caption border rounded-full transition-all cursor-pointer ${
                  chartPeriod === 'quarter'
                    ? 'border-secondary text-secondary bg-secondary/5'
                    : 'border-outline-variant hover:bg-surface-container'
                }`}
              >
                Quarter
              </button>
            </div>
          </div>
          {businessesLoading ? (
            <div className="flex-1 flex items-end gap-3 px-2 min-h-[240px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-full min-h-[120px] rounded-t" />
              ))}
            </div>
          ) : chartBars.every((b) => b.count === 0) ? (
            <div className="flex-1 flex items-center justify-center font-caption text-on-surface-variant">
              No businesses onboarded in this period yet
            </div>
          ) : (
            <div className="flex-1 w-full flex items-end justify-between gap-3 px-2 min-h-[240px]">
              {chartBars.map((bar) => (
                <div
                  key={bar.label}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                >
                  <div
                    className={`w-full rounded-t relative transition-all duration-500 ${
                      bar.highlight
                        ? 'bg-secondary/20 border-t-2 border-secondary'
                        : 'bg-surface-container-high'
                    }`}
                    style={{ height: `${bar.h}%` }}
                  >
                    {bar.count > 0 && (
                      <div
                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-primary text-white text-[10px] px-2 py-1 rounded whitespace-nowrap ${
                          bar.highlight ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {bar.count}
                      </div>
                    )}
                  </div>
                  <span className="font-caption text-on-surface-variant text-[10px]">{bar.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-bright p-6 rounded-lg border-hairline flex flex-col gap-4">
          <h2 className="font-title-lg text-on-surface">Platform Status</h2>
          <div className="space-y-3">
            {statusItems.map((node) => (
              <div
                key={node.name}
                className={`p-3 bg-surface-container-low flex justify-between items-center ${
                  node.ok ? 'accent-border-left' : 'border-l-2 border-error'
                }`}
              >
                <div>
                  <p className="font-body-emphasis text-on-surface">{node.name}</p>
                  <p className="text-[11px] text-on-surface-variant font-mono">{node.detail}</p>
                </div>
                {node.ok ? (
                  <span className="h-2 w-2 rounded-full bg-on-tertiary-container animate-pulse" />
                ) : (
                  <Icon name="warning" className="text-error text-[16px]" />
                )}
              </div>
            ))}
          </div>
          <Link
            href="/platform/businesses"
            className="mt-auto w-full py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-all text-caption rounded text-center"
          >
            View All Tenants
          </Link>
        </div>
      </section>

      <section className="bg-surface-bright rounded-lg border-hairline overflow-hidden w-full">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
          <h2 className="font-title-lg text-on-surface">Recent Audit Activity</h2>
          <Link
            href="/platform/audit"
            className="text-secondary font-body-emphasis text-caption hover:underline transition-all"
          >
            View all logs
          </Link>
        </div>
        <div className="overflow-x-auto w-full">
          {logsLoading ? (
            <div className="p-4">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-6 py-4 font-mono text-[13px] text-on-surface-variant">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-container-high shrink-0 flex items-center justify-center font-caption text-[10px]">
                          {log.platformUser.name.charAt(0)}
                        </div>
                        <span className="font-body-emphasis">{log.platformUser.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface">{log.action}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatAuditResource(log)}</td>
                    <td className="px-6 py-4">{auditStatusBadge(log.action)}</td>
                  </tr>
                ))}
                {logs.length === 0 && !logsLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 font-caption text-center text-on-surface-variant">
                      No audit logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between">
          <p className="font-caption text-on-surface-variant">
            {logs.length === 0
              ? 'No entries'
              : `Showing 1–${Math.min(10, logs.length)} of ${logs.length.toLocaleString()} entries`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="p-1 border border-outline-variant rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <Icon name="chevron_left" />
            </button>
            <Link
              href="/platform/audit"
              className="p-1 border border-outline-variant rounded hover:bg-surface-container transition-colors"
            >
              <Icon name="chevron_right" />
            </Link>
          </div>
        </div>
      </section>
    </PlatformLayout>
  );
}
