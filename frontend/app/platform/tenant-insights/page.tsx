'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import {
  Icon,
  Input,
  StatCard,
  StatCardSkeleton,
  TableSkeleton,
} from '@/components/ui';
import { DataPanel, PageHeader } from '@/components/ui/page-shell';
import {
  usePlatformTenantAnalytics,
  usePlatformTenantAnalyticsDetail,
} from '@/lib/hooks/queries';
import { formatCurrency } from '@/lib/format-currency';
import {
  formatReportRangeLabel,
  getReportPresetRange,
  type ReportPreset,
} from '@/lib/report-dates';
import { BarChart, ReportTable } from '@/components/reports/report-ui';
import type { PlatformTenantAnalyticsRow } from '@/lib/api/types';

const PRESETS: { id: ReportPreset; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
];

/** Platform admin displays monetary values in PKR unless the tenant has another currency set. */
const PLATFORM_DISPLAY_CURRENCY = 'PKR';

function money(amount: string | number) {
  return formatCurrency(amount, PLATFORM_DISPLAY_CURRENCY);
}

export default function PlatformTenantInsightsPage() {
  const [preset, setPreset] = useState<ReportPreset>('30d');
  const initialRange = getReportPresetRange('30d');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: tenants = [], isLoading: listLoading } = usePlatformTenantAnalytics(from, to);
  const { data: detail, isLoading: detailLoading } = usePlatformTenantAnalyticsDetail(
    selectedId,
    from,
    to,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }, [tenants, search]);

  const totals = useMemo(() => {
    let orders = 0;
    let revenue = 0;
    for (const row of tenants) {
      orders += row.orderCount;
      revenue += Number(row.revenue);
    }
    return { orders, revenue, tenantCount: tenants.length };
  }, [tenants]);

  function applyPreset(id: ReportPreset) {
    setPreset(id);
    const range = getReportPresetRange(id);
    setFrom(range.from);
    setTo(range.to);
  }

  function selectTenant(row: PlatformTenantAnalyticsRow) {
    setSelectedId(row.businessId);
  }

  return (
    <PlatformLayout title="Tenant insights">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Tenant insights"
          description="Compare revenue and top sellers across tenants. The detail panel follows each tenant’s business-day report rules; the table uses order completion time for a quick ranking."
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg font-caption transition-colors ${
                  preset === p.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setPreset('custom');
                setFrom(e.target.value);
              }}
              className="w-full min-w-0 sm:w-auto"
              aria-label="From date"
            />
            <span className="text-on-surface-variant font-caption text-center self-center">to</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setPreset('custom');
                setTo(e.target.value);
              }}
              className="w-full min-w-0 sm:w-auto"
              aria-label="To date"
            />
          </div>
        </div>

        <p className="font-caption text-on-surface-variant">{formatReportRangeLabel(from, to)}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {listLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard label="Tenants" value={String(totals.tenantCount)} icon="store" />
              <StatCard label="Completed orders" value={String(totals.orders)} icon="receipt_long" />
              <StatCard
                label="Gross revenue (listed)"
                value={formatCurrency(totals.revenue, PLATFORM_DISPLAY_CURRENCY)}
                icon="payments"
                dense
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6">
          <DataPanel
            className={`xl:col-span-2 p-0 overflow-hidden min-w-0 ${selectedId ? 'max-xl:hidden' : ''}`}
          >
            <div className="p-4 border-b border-outline-variant/30 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <h2 className="font-body-emphasis text-on-surface">Tenants</h2>
              <Input
                placeholder="Search name or slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:max-w-xs"
              />
            </div>
            {listLoading ? (
              <TableSkeleton rows={8} />
            ) : filtered.length === 0 ? (
              <p className="p-6 text-on-surface-variant font-body-base">No tenants match.</p>
            ) : (
              <div className="overflow-x-auto max-h-[min(520px,60vh)] xl:max-h-[520px] overflow-y-auto">
                <table className="w-full text-left min-w-[280px]">
                  <thead className="sticky top-0 bg-surface-bright z-10">
                    <tr className="border-b border-outline-variant/30">
                      <th className="px-4 py-3 font-caption text-on-surface-variant">Tenant</th>
                      <th className="px-4 py-3 font-caption text-on-surface-variant text-right">
                        Orders
                      </th>
                      <th className="px-4 py-3 font-caption text-on-surface-variant text-right">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const active = selectedId === row.businessId;
                      return (
                        <tr
                          key={row.businessId}
                          className={`border-b border-outline-variant/20 cursor-pointer transition-colors ${
                            active ? 'bg-primary-container/40' : 'hover:bg-surface-container-low'
                          }`}
                          onClick={() => selectTenant(row)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-body-emphasis text-on-surface">{row.name}</div>
                            <div className="font-caption text-on-surface-variant flex items-center gap-2">
                              <span>/{row.slug}</span>
                              {row.isSuspended && (
                                <span className="text-error text-[10px] uppercase font-bold">
                                  Suspended
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.orderCount}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-body-emphasis">
                            {money(row.revenue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DataPanel>

          <DataPanel
            className={`xl:col-span-3 p-3 sm:p-4 flex flex-col gap-4 min-h-[280px] min-w-0 ${
              !selectedId ? 'max-xl:hidden' : ''
            }`}
          >
            {!selectedId ? (
              <div className="hidden xl:flex flex-col items-center justify-center flex-1 gap-2 text-on-surface-variant py-12">
                <Icon name="touch_app" className="text-4xl opacity-50" />
                <p className="font-body-base text-center px-4">
                  Select a tenant to view sales breakdown.
                </p>
              </div>
            ) : detailLoading || !detail ? (
              <div className="flex flex-col gap-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <TableSkeleton rows={5} />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="xl:hidden shrink-0 p-2 -ml-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low tap-target"
                      aria-label="Back to tenant list"
                    >
                      <Icon name="arrow_back" />
                    </button>
                    <div className="min-w-0">
                    <h2 className="font-display-sm text-on-surface truncate">{detail.business.name}</h2>
                    <p className="font-caption text-on-surface-variant">
                      /{detail.business.slug} · {detail.period.from} – {detail.period.to}
                    </p>
                    </div>
                  </div>
                  <Link
                    href={`/${detail.business.slug}/reports`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-secondary font-caption hover:underline"
                  >
                    Open tenant reports
                    <Icon name="open_in_new" className="text-[16px]" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                  <StatCard
                    label="Net sales"
                    value={money(detail.sales.netSales)}
                    icon="sell"
                    dense
                  />
                  <StatCard
                    label="Orders"
                    value={String(detail.sales.orderCount)}
                    icon="receipt"
                    dense
                  />
                  <StatCard
                    label="Avg. order"
                    value={money(detail.sales.averageOrderValue)}
                    icon="shopping_cart"
                    dense
                  />
                  <StatCard
                    label="Discounts"
                    value={money(detail.sales.discounts)}
                    icon="percent"
                    dense
                  />
                </div>

                <div>
                  <h3 className="font-body-emphasis mb-2">Top products (by revenue)</h3>
                  <ReportTable
                    loading={false}
                    headers={['Product', 'Qty', 'Revenue']}
                    rows={detail.topProducts.map((p) => [
                      p.name,
                      p.quantitySold,
                      money(p.revenue),
                    ])}
                    emptyMessage="No product sales in this range."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-body-emphasis mb-2">By order type</h3>
                    {detail.orderTypes.length > 0 ? (
                      <BarChart
                        items={detail.orderTypes.map((r) => ({
                          label: r.orderType.replace(/_/g, ' '),
                          revenue: Number(r.revenue),
                        }))}
                        labelKey="label"
                        valueKey="revenue"
                        formatValue={(v) => money(v)}
                      />
                    ) : (
                      <p className="font-caption text-on-surface-variant">No data.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-body-emphasis mb-2">By payment method</h3>
                    {detail.payments.length > 0 ? (
                      <BarChart
                        items={detail.payments.map((r) => ({
                          label: r.method,
                          revenue: Number(r.netAmount),
                        }))}
                        labelKey="label"
                        valueKey="revenue"
                        formatValue={(v) => money(v)}
                      />
                    ) : (
                      <p className="font-caption text-on-surface-variant">No data.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </DataPanel>
        </div>
      </div>
    </PlatformLayout>
  );
}
