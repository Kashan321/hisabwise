'use client';

import { use, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-shell';
import { BarChart, PrintReportButton, ReportPanel, ReportStatGrid } from '@/components/reports/report-ui';
import { ReportFiltersBar, useReportFilterState } from '@/components/reports/report-filters';
import { ReportsMobileHeader } from '@/components/reports/reports-mobile-header';
import { useReportDashboard } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { paymentMethodLabel } from '@/lib/payment-methods';
import {
  formatSalesTrendBucketLabel,
  isSalesTrendHourOfDayBucket,
} from '@/lib/report-dates';

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine-in',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  QR: 'QR',
};

export default function ReportsDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: _slug } = use(params);
  const formatMoney = useFormatMoney();
  const filterState = useReportFilterState('today');
  const {
    filters,
    rangeLabel,
    preset,
    setPreset,
    useCustom,
    setUseCustom,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    setExtra,
  } = filterState;

  useEffect(() => {
    setExtra({});
  }, [preset, useCustom, customFrom, customTo, setExtra]);

  const { data, isLoading } = useReportDashboard(filters);
  const dashboard = data?.dashboard;
  const charts = data?.charts;

  const primaryStats = dashboard
    ? [
        { label: 'Gross sales', value: dashboard.grossSales },
        { label: 'Net sales', value: dashboard.netSales },
        { label: 'Total orders', value: dashboard.totalOrders },
        { label: 'Average order', value: dashboard.averageOrderValue },
      ]
    : [];

  const secondaryStats = dashboard
    ? [
        { label: 'Discounts', value: dashboard.totalDiscounts },
        { label: 'Tax', value: dashboard.totalTax },
        { label: 'Service charges', value: dashboard.totalServiceCharges },
        { label: 'Refunds', value: dashboard.refunds },
        { label: 'Purchases', value: dashboard.totalPurchases },
        { label: 'Wastage value', value: dashboard.wastageValue },
      ]
    : [];

  const trendRange =
    filters.from && filters.to ? { from: filters.from, to: filters.to } : undefined;

  const salesTrend =
    charts?.salesOverTime.map((t) => ({
      label: formatSalesTrendBucketLabel(t.bucket, trendRange),
      revenue: t.revenue,
      orderCount: t.orderCount,
    })) ?? [];

  const firstSalesBucket = charts?.salesOverTime[0]?.bucket;
  const salesTrendByHourOfDay = Boolean(
    firstSalesBucket && isSalesTrendHourOfDayBucket(firstSalesBucket),
  );

  const paymentBars =
    charts?.salesByPaymentMethod.map((p) => ({
      label: paymentMethodLabel(p.method),
      totalAmount: p.totalAmount,
    })) ?? [];

  const orderTypeBars =
    charts?.salesByOrderType.map((o) => ({
      label: ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
      revenue: o.revenue,
    })) ?? [];

  const overviewPrint = {
    reportId: 'overview',
    title: 'Reports Overview',
    rangeLabel,
    formatMoney,
    dashboard,
  };

  const headerActions = (
    <PrintReportButton printInput={overviewPrint} disabled={isLoading} />
  );

  return (
    <>
      <ReportsMobileHeader
        title="Reports & Analytics"
        badge={rangeLabel}
        actions={headerActions}
      />

      <div className="hidden md:block">
        <PageHeader
          icon="analytics"
          title="Reports & Analytics"
          description="Track sales, payments, inventory, and business performance."
          badge={rangeLabel}
          actions={headerActions}
        />
      </div>

      <div className="flex flex-col gap-4 md:gap-6">
        <ReportFiltersBar
          config={{ date: true, orderType: true, paymentMethod: true }}
          value={filters}
          onChange={(next) =>
            setExtra({
              orderType: next.orderType,
              paymentMethod: next.paymentMethod,
            })
          }
          preset={preset}
          setPreset={setPreset}
          useCustom={useCustom}
          setUseCustom={setUseCustom}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
        />

        <ReportStatGrid stats={primaryStats} loading={isLoading} formatMoney={formatMoney} />

        <ReportStatGrid stats={secondaryStats} loading={isLoading} formatMoney={formatMoney} />

        {!dashboard?.tipsAvailable && (
          <p className="font-caption text-on-surface-variant text-sm">
            Tips are not tracked separately. Service charges appear under Sales.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <ReportPanel title="Sales over time">
            {salesTrend.length === 0 && !isLoading ? (
              <p className="text-on-surface-variant font-caption">No sales found for this date range.</p>
            ) : (
              <>
                {salesTrendByHourOfDay && (
                  <p className="font-caption text-on-surface-variant text-xs mb-3 -mt-1">
                    Grouped by time of day — tallest bars show when orders peak in this range.
                  </p>
                )}
                <BarChart
                  items={salesTrend}
                  valueKey="revenue"
                  labelKey="label"
                  formatValue={(v) => formatMoney(v)}
                  formatBarTitle={(item, value) => {
                    const orders = item.orderCount;
                    const sales = formatMoney(value);
                    return typeof orders === 'number'
                      ? `${orders} orders · ${sales}`
                      : sales;
                  }}
                />
              </>
            )}
          </ReportPanel>

          <ReportPanel title="Sales by payment method">
            {paymentBars.length === 0 && !isLoading ? (
              <p className="text-on-surface-variant font-caption">No payment data for this range.</p>
            ) : (
              <BarChart
                items={paymentBars}
                valueKey="totalAmount"
                labelKey="label"
                formatValue={(v) => formatMoney(v)}
              />
            )}
          </ReportPanel>

          <ReportPanel title="Sales by order type">
            {orderTypeBars.length === 0 && !isLoading ? (
              <p className="text-on-surface-variant font-caption">No orders for this range.</p>
            ) : (
              <BarChart
                items={orderTypeBars}
                valueKey="revenue"
                labelKey="label"
                formatValue={(v) => formatMoney(v)}
              />
            )}
          </ReportPanel>

          <ReportPanel title="Top products">
            {(charts?.topProducts ?? []).length === 0 && !isLoading ? (
              <p className="text-on-surface-variant font-caption">No product sales in this range.</p>
            ) : (
              <ul className="space-y-2">
                {(charts?.topProducts ?? []).map((p) => (
                  <li
                    key={p.menuItemId}
                    className="flex justify-between items-center py-2 border-b border-outline-variant/20 last:border-0"
                  >
                    <div>
                      <p className="font-body text-sm text-on-surface">{p.name}</p>
                      <p className="font-caption text-on-surface-variant">{p.quantitySold} sold</p>
                    </div>
                    <span className="font-body text-sm font-medium">{formatMoney(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </ReportPanel>
        </div>
      </div>
    </>
  );
}
