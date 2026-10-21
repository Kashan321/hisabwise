'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Button,
  Icon,
  Skeleton,
  StatusChip,
  orderBorderAccent,
  orderStatusVariant,
  timeAgo,
} from '@/components/ui';
import { OrderSourceBadge, OrderTypeBadge } from '@/components/orders/order-badges';
import { paymentMethodLabel } from '@/lib/payment-methods';
import type { DailyRevenueItem, Order, PaymentBreakdownItem } from '@/lib/api/types';
import {
  useBusiness,
  useFloorTables,
  useOrders,
  useReportDailyRevenue,
  useReportPaymentBreakdown,
  useReportSummary,
  useCurrentBusinessDay,
} from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { formatOrderLabel } from '@/lib/order-display';
import {
  formatReportRangeLabel,
  getReportPresetRange,
  resolveTodayBusinessDateContext,
} from '@/lib/report-dates';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function RevenueTrendChart({
  daily,
  formatMoney,
}: {
  daily: DailyRevenueItem[];
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  const max = Math.max(...daily.map((d) => Number(d.totalAmount)), 1);
  const total = daily.reduce((sum, d) => sum + Number(d.totalAmount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-caption text-on-surface-variant uppercase tracking-wider">7-day revenue</p>
          <p className="font-display-lg text-primary mt-1">{formatMoney(total)}</p>
        </div>
        <p className="font-caption text-on-surface-variant text-right">
          {daily.length} days tracked
        </p>
      </div>
      <div className="flex items-end gap-1.5 h-36 pt-2">
        {daily.map((day) => {
          const amount = Number(day.totalAmount);
          const height = amount > 0 ? Math.max(12, Math.round((amount / max) * 100)) : 6;
          const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: 'short',
          });
          const todayStr = new Date().toISOString().slice(0, 10);
          const isTodayBar = day.date === todayStr;

          return (
            <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex justify-center items-end h-28">
                <div
                  className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 ${
                    amount > 0
                      ? isTodayBar
                        ? 'bg-primary group-hover:opacity-90'
                        : 'bg-secondary/80 group-hover:bg-secondary'
                      : 'bg-outline-variant/25'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${label}: ${formatMoney(amount)}`}
                />
              </div>
              <span
                className={`font-caption text-[10px] truncate w-full text-center ${
                  isTodayBar ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentMixCard({
  breakdown,
  formatMoney,
  loading,
}: {
  breakdown: PaymentBreakdownItem[];
  formatMoney: (amount: number | string | null | undefined) => string;
  loading?: boolean;
}) {
  const total = breakdown.reduce((sum, item) => sum + Number(item.totalAmount), 0);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!breakdown.length) {
    return (
      <p className="font-body-base text-on-surface-variant text-sm py-4 text-center">
        Payment data appears after completed orders today.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {breakdown.map((item) => {
        const amount = Number(item.totalAmount);
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return (
          <div key={item.paymentMethod} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-body-emphasis text-on-surface">
                {paymentMethodLabel(item.paymentMethod)}
              </span>
              <span className="font-caption text-on-surface-variant shrink-0">
                {formatMoney(amount)} · {item.orderCount} orders
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/80 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KitchenPipeline({
  received,
  preparing,
  ready,
}: {
  received: number;
  preparing: number;
  ready: number;
}) {
  const total = received + preparing + ready;
  const stages = [
    { key: 'RECEIVED', label: 'Received', count: received, color: 'bg-on-surface-variant' },
    { key: 'PREPARING', label: 'Preparing', count: preparing, color: 'bg-secondary' },
    { key: 'READY', label: 'Ready', count: ready, color: 'bg-tertiary-fixed' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-container-high">
        {total > 0 ? (
          stages.map((stage) => (
            <div
              key={stage.key}
              className={`${stage.color} transition-all`}
              style={{ width: `${(stage.count / total) * 100}%` }}
            />
          ))
        ) : (
          <div className="w-full bg-outline-variant/20" />
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className="rounded-xl bg-surface-container-low p-3 text-center border border-outline-variant/15"
          >
            <p className="font-display-lg text-primary leading-none">{stage.count}</p>
            <p className="font-caption text-on-surface-variant mt-1 uppercase tracking-wide text-[10px]">
              {stage.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableOccupancy({
  occupied,
  available,
  total,
}: {
  occupied: number;
  available: number;
  total: number;
}) {
  const pct = total ? Math.round((occupied / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display-lg text-primary">{occupied}<span className="text-on-surface-variant font-body-base">/{total || '—'}</span></p>
          <p className="font-caption text-on-surface-variant">tables occupied</p>
        </div>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary-container text-on-primary-container"
          style={{
            background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--surface-container-high) 0deg)`,
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center font-body-emphasis text-sm text-primary">
            {total ? `${pct}%` : '—'}
          </div>
        </div>
      </div>
      {total > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: Math.min(total, 24) }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${
                i < occupied ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            />
          ))}
          {total > 24 && (
            <span className="font-caption text-on-surface-variant text-[10px] self-center">
              +{total - 24}
            </span>
          )}
        </div>
      )}
      <p className="font-caption text-on-surface-variant">
        {available} available · {occupied} in service
      </p>
    </div>
  );
}

function LiveOrderTile({
  order,
  slug,
  formatMoney,
}: {
  order: Order;
  slug: string;
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  return (
    <Link
      href={`/${slug}/orders`}
      className={`block rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3 transition-all hover:border-secondary/40 hover:shadow-sm border-l-[3px] ${orderBorderAccent(order.status)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-xs font-bold text-on-surface">{formatOrderLabel(order)}</p>
        <span className="font-caption text-[10px] text-on-surface-variant shrink-0 flex items-center gap-0.5">
          <Icon name="schedule" className="text-[10px]" />
          {timeAgo(order.createdAt)}
        </span>
      </div>

      <p className="font-caption text-on-surface-variant mt-1.5 line-clamp-2 leading-snug">
        {order.items?.slice(0, 3).map((i) => `${i.quantity}× ${i.menuItemName}`).join(', ') ??
          'No items'}
        {(order.items?.length ?? 0) > 3 ? '…' : ''}
      </p>

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-outline-variant/10">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          <OrderTypeBadge orderType={order.orderType} compact />
          <OrderSourceBadge source={order.source} />
          {order.tableIdentifier && (order.orderType === 'DINE_IN' || !order.orderType) && (
            <span className="font-caption text-[10px] text-on-surface-variant truncate">
              T{order.tableIdentifier}
            </span>
          )}
        </div>
        <span className="font-body-emphasis text-xs text-primary shrink-0 tabular-nums">
          {formatMoney(order.totalAmount)}
        </span>
      </div>
    </Link>
  );
}

const LIVE_ORDER_COLUMNS = [
  {
    status: 'RECEIVED' as const,
    label: 'Received',
    icon: 'inbox',
    headerClass: 'bg-surface-container-high/80',
    emptyLabel: 'Waiting to start',
  },
  {
    status: 'PREPARING' as const,
    label: 'Preparing',
    icon: 'skillet',
    headerClass: 'bg-secondary-fixed/50',
    emptyLabel: 'Nothing cooking',
  },
  {
    status: 'READY' as const,
    label: 'Ready',
    icon: 'check_circle',
    headerClass: 'bg-tertiary-fixed/40',
    emptyLabel: 'No pickups waiting',
  },
];

function LiveOrdersPanel({
  orders,
  slug,
  formatMoney,
  loading,
}: {
  orders: Order[];
  slug: string;
  formatMoney: (amount: number | string | null | undefined) => string;
  loading?: boolean;
}) {
  const [mobileTab, setMobileTab] = useState<'RECEIVED' | 'PREPARING' | 'READY'>('PREPARING');

  const grouped = useMemo(
    () => ({
      RECEIVED: orders.filter((o) => o.status === 'RECEIVED'),
      PREPARING: orders.filter((o) => o.status === 'PREPARING'),
      READY: orders.filter((o) => o.status === 'READY'),
    }),
    [orders],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container/20 px-6 py-10 text-center">
        <Icon name="receipt_long" className="text-3xl text-outline-variant mb-2" />
        <p className="font-body-emphasis text-on-surface">No active orders</p>
        <p className="font-caption text-on-surface-variant mt-1 mb-4 max-w-sm mx-auto">
          Orders from staff, QR, or delivery will appear here in real time.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/${slug}/orders`}>
            <Button variant="primary" className="text-sm">New order</Button>
          </Link>
          <Link href={`/${slug}/kitchen`}>
            <Button variant="outline" className="text-sm">Open kitchen</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mobileColumn = LIVE_ORDER_COLUMNS.find((c) => c.status === mobileTab)!;

  return (
    <div className="space-y-3">
      {/* Mobile status tabs */}
      <div className="flex gap-2 md:hidden overflow-x-auto hide-scrollbar pb-1">
        {LIVE_ORDER_COLUMNS.map((col) => {
          const count = grouped[col.status].length;
          const active = mobileTab === col.status;
          return (
            <button
              key={col.status}
              type="button"
              onClick={() => setMobileTab(col.status)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-body-emphasis transition-colors ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'
              }`}
            >
              <Icon name={col.icon} className="text-base" />
              {col.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-on-primary/20' : 'bg-surface-container-high'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile single column */}
      <div className="md:hidden rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden">
        <div
          className={`flex items-center justify-between px-3 py-2 border-b border-outline-variant/10 ${mobileColumn.headerClass}`}
        >
          <span className="font-body-emphasis text-sm flex items-center gap-2">
            <Icon name={mobileColumn.icon} className="text-base" />
            {mobileColumn.label}
          </span>
          <span className="font-caption text-on-surface-variant">{grouped[mobileTab].length}</span>
        </div>
        <div className="p-2 space-y-2 max-h-[280px] overflow-y-auto">
          {grouped[mobileTab].map((order) => (
            <LiveOrderTile key={order.id} order={order} slug={slug} formatMoney={formatMoney} />
          ))}
          {!grouped[mobileTab].length && (
            <p className="font-caption text-on-surface-variant text-center py-6">
              {mobileColumn.emptyLabel}
            </p>
          )}
        </div>
      </div>

      {/* Desktop kanban */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {LIVE_ORDER_COLUMNS.map((col) => {
          const columnOrders = grouped[col.status];
          return (
            <div
              key={col.status}
              className="rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden flex flex-col min-h-[200px] max-h-[360px]"
            >
              <div
                className={`flex items-center justify-between px-3 py-2.5 border-b border-outline-variant/10 shrink-0 ${col.headerClass}`}
              >
                <span className="font-body-emphasis text-sm flex items-center gap-2 text-on-surface">
                  <Icon name={col.icon} className="text-base" />
                  {col.label}
                </span>
                <span
                  className="font-caption text-xs font-bold px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant/15"
                >
                  {columnOrders.length}
                </span>
              </div>
              <div className="p-2 space-y-2 overflow-y-auto flex-1">
                {columnOrders.map((order) => (
                  <LiveOrderTile key={order.id} order={order} slug={slug} formatMoney={formatMoney} />
                ))}
                {!columnOrders.length && (
                  <p className="font-caption text-on-surface-variant text-center py-8 px-2">
                    {col.emptyLabel}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickActionTile({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border transition-all active:scale-[0.98] text-center min-h-[5.5rem] ${
        primary
          ? 'bg-primary text-on-primary border-primary hover:opacity-95'
          : 'bg-surface-container-low border-outline-variant/15 hover:border-secondary/30 hover:bg-surface-container'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          primary ? 'bg-on-primary/15' : 'bg-primary-container text-primary'
        }`}
      >
        <Icon name={icon} className="text-xl" />
      </div>
      <span className="font-body-emphasis text-xs sm:text-sm leading-snug">{label}</span>
    </Link>
  );
}

function QuickActionCompact({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${
        primary
          ? 'bg-primary text-on-primary border-primary hover:opacity-95'
          : 'bg-surface-container-low border-outline-variant/15 hover:border-secondary/30 hover:bg-surface-container'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          primary ? 'bg-on-primary/15' : 'bg-primary-container text-primary'
        }`}
      >
        <Icon name={icon} className="text-lg" />
      </div>
      <span className="font-body-emphasis text-sm flex-1 min-w-0 truncate">{label}</span>
      <Icon
        name="chevron_right"
        className={`shrink-0 text-base ${primary ? 'text-on-primary/70' : 'text-on-surface-variant'}`}
      />
    </Link>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function OverviewDashboard({ slug }: { slug: string }) {
  const { data: businessDayState } = useCurrentBusinessDay();
  const todayBusinessContext = useMemo(
    () => resolveTodayBusinessDateContext(businessDayState),
    [businessDayState],
  );
  const todayRange = useMemo(
    () => getReportPresetRange('today', todayBusinessContext),
    [todayBusinessContext],
  );
  const weekRange = useMemo(() => getReportPresetRange('7d'), []);

  const { data: business } = useBusiness();
  const { data: ordersData, isLoading: ordersLoading } = useOrders();
  const { data: todaySummary, isLoading: summaryLoading } = useReportSummary(todayRange);
  const { data: dailyRevenue = [], isLoading: chartLoading } = useReportDailyRevenue(weekRange);
  const { data: paymentBreakdown = [], isLoading: paymentLoading } =
    useReportPaymentBreakdown(todayRange);
  const { data: tables = [] } = useFloorTables();
  const formatMoney = useFormatMoney();

  const orders = ordersData?.orders ?? [];
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const recentOrders = orders.slice(0, 6);

  const kitchenCounts = useMemo(
    () => ({
      received: activeOrders.filter((o) => o.status === 'RECEIVED').length,
      preparing: activeOrders.filter((o) => o.status === 'PREPARING').length,
      ready: activeOrders.filter((o) => o.status === 'READY').length,
    }),
    [activeOrders],
  );

  const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
  const available = tables.filter((t) => t.status === 'AVAILABLE').length;
  const revenue = Number(todaySummary?.totalRevenue ?? 0);
  const orderCount = todaySummary?.orderCount ?? 0;
  const avgTicket = Number(todaySummary?.averageTicket ?? 0);

  const todayLabel = formatReportRangeLabel(todayRange.from, todayRange.to);
  const businessName = business?.name ?? slug.replace(/-/g, ' ');
  const initialLoading = ordersLoading && summaryLoading;

  if (initialLoading && !orders.length) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Hero — compact strip */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-[#3d8a7e] px-4 py-3 md:px-5 md:py-3.5 text-on-primary shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-caption uppercase tracking-wider text-on-primary/65 text-[10px] leading-none">
              {todayLabel}
            </p>
            <h2 className="mt-1 text-lg md:text-xl font-bold leading-snug">
              <span className="text-on-primary/90 font-medium">{getGreeting()}, </span>
              <span className="break-words line-clamp-1" title={businessName}>
                {businessName}
              </span>
            </h2>
          </div>

          <div className="flex gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
            {[
              { label: 'Revenue', value: summaryLoading ? '…' : formatMoney(revenue) },
              { label: 'Orders', value: summaryLoading ? '…' : String(orderCount) },
              { label: 'Active', value: ordersLoading ? '…' : String(activeOrders.length) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 sm:flex-none rounded-lg bg-on-primary/12 border border-on-primary/15 px-3 py-2 min-w-0 sm:min-w-[100px]"
              >
                <p className="text-[9px] uppercase tracking-wider text-on-primary/65 leading-none">
                  {stat.label}
                </p>
                <p className="text-sm md:text-base font-bold mt-1 tabular-nums truncate leading-tight">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metric strip */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {[
          {
            label: 'Avg ticket',
            value: summaryLoading ? '…' : formatMoney(avgTicket),
            icon: 'receipt_long',
            sub: orderCount ? 'Per completed order' : 'No orders yet',
            href: `/${slug}/reports`,
          },
          {
            label: 'Kitchen load',
            value: String(activeOrders.length),
            icon: 'skillet',
            sub: `${kitchenCounts.preparing} preparing`,
            href: `/${slug}/kitchen`,
          },
          {
            label: 'Floor capacity',
            value: tables.length ? `${Math.round((occupied / tables.length) * 100)}%` : '—',
            icon: 'table_restaurant',
            sub: tables.length ? `${occupied} tables busy` : 'Set up floor plan',
            href: `/${slug}/floor-plan`,
          },
          {
            label: 'Ready to serve',
            value: String(kitchenCounts.ready),
            icon: 'check_circle',
            sub: kitchenCounts.ready ? 'Orders waiting pickup' : 'None waiting',
            href: `/${slug}/kitchen`,
          },
        ].map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 md:p-5 card-hairline hover:border-secondary/30 hover:bg-surface-container-low transition-colors block"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-caption text-on-surface-variant uppercase tracking-wider text-[10px]">
                {metric.label}
              </span>
              <Icon name={metric.icon} className="text-on-surface-variant/60 text-lg" />
            </div>
            <p className="font-display-lg text-primary tabular-nums">{metric.value}</p>
            <p className="font-caption text-on-surface-variant mt-1 text-xs">{metric.sub}</p>
          </Link>
        ))}
      </section>

      {/* Main dashboard grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-start">
        <div className="lg:col-span-7 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 md:p-6 card-hairline">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-lg text-primary">Revenue trend</h3>
            <Link
              href={`/${slug}/reports`}
              className="font-caption text-secondary hover:underline flex items-center gap-1"
            >
              Full reports
              <Icon name="arrow_forward" className="text-sm" />
            </Link>
          </div>
          {chartLoading ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : (
            <RevenueTrendChart daily={dailyRevenue} formatMoney={formatMoney} />
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 md:p-6 card-hairline">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-lg text-primary">Kitchen pipeline</h3>
            <Link href={`/${slug}/kitchen`} className="font-caption text-secondary hover:underline">
              Open KDS
            </Link>
          </div>
          <KitchenPipeline
            received={kitchenCounts.received}
            preparing={kitchenCounts.preparing}
            ready={kitchenCounts.ready}
          />
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 md:p-6 card-hairline">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-lg text-primary">Floor status</h3>
            <Link href={`/${slug}/floor-plan`} className="font-caption text-secondary hover:underline">
              Floor plan
            </Link>
          </div>
          <TableOccupancy
            occupied={occupied}
            available={available}
            total={tables.length}
          />
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 md:p-6 card-hairline">
          <h3 className="font-title-lg text-primary mb-4">Payments today</h3>
          <PaymentMixCard
            breakdown={paymentBreakdown}
            formatMoney={formatMoney}
            loading={paymentLoading}
          />
        </div>

        <div className="lg:col-span-12 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 md:p-6 card-hairline">
          <h3 className="font-title-lg text-primary mb-4">Quick actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <QuickActionTile
              href={`/${slug}/orders`}
              icon="add_shopping_cart"
              label="New order"
              primary
            />
            <QuickActionTile href={`/${slug}/kitchen`} icon="skillet" label="Kitchen" />
            <QuickActionTile href={`/${slug}/terminal`} icon="point_of_sale" label="POS Terminal" />
            <QuickActionTile href={`/${slug}/menu`} icon="restaurant_menu" label="Edit menu" />
            <QuickActionTile href={`/${slug}/reports`} icon="analytics" label="Reports" />
            <QuickActionTile href={`/${slug}/delivery`} icon="delivery_dining" label="Delivery" />
          </div>
        </div>
      </section>

      {/* Live orders + recent */}
      <section className="space-y-4">
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 md:p-5 card-hairline">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="font-title-lg text-primary">Live orders</h3>
              <p className="font-caption text-on-surface-variant mt-0.5">
                {activeOrders.length} active · {kitchenCounts.received} received ·{' '}
                {kitchenCounts.preparing} preparing · {kitchenCounts.ready} ready
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/${slug}/kitchen`}>
                <Button variant="outline" className="text-sm py-2 px-3">
                  <Icon name="skillet" className="text-base" />
                  Kitchen
                </Button>
              </Link>
              <Link href={`/${slug}/orders`}>
                <Button variant="primary" className="text-sm py-2 px-3">
                  All orders
                </Button>
              </Link>
            </div>
          </div>

          <LiveOrdersPanel
            orders={activeOrders}
            slug={slug}
            formatMoney={formatMoney}
            loading={ordersLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <div className="space-y-4">
            <div>
              <h3 className="font-title-lg text-primary">Recent activity</h3>
              <p className="font-caption text-on-surface-variant mt-0.5">
                Latest orders across channels
              </p>
            </div>

            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest divide-y divide-outline-variant/10 card-hairline overflow-hidden">
              {recentOrders.length ? (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/${slug}/orders`}
                    className="flex gap-3 p-4 hover:bg-surface-container-low transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        order.status === 'COMPLETED'
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                          : order.status === 'CANCELLED'
                            ? 'bg-error-container/50 text-on-error-container'
                            : 'bg-primary-container text-primary'
                      }`}
                    >
                      <Icon name="receipt_long" className="text-lg" filled />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-body-emphasis text-sm text-on-surface">
                          {formatOrderLabel(order)}
                        </p>
                        <StatusChip
                          label={order.status}
                          variant={orderStatusVariant(order.status)}
                        />
                      </div>
                      <p className="font-caption text-on-surface-variant truncate mt-0.5">
                        {order.items?.map((i) => `${i.quantity}× ${i.menuItemName}`).join(', ') ??
                          'Order'}
                        · {formatMoney(order.totalAmount)}
                      </p>
                    </div>
                    <span className="font-caption text-on-surface-variant/60 shrink-0 text-xs">
                      {timeAgo(order.createdAt)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="p-8 font-caption text-on-surface-variant text-center">
                  Activity will appear once you start taking orders.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-title-lg text-primary">Shortcuts</h3>
              <p className="font-caption text-on-surface-variant mt-0.5">Jump to common tasks</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <QuickActionCompact href={`/${slug}/reservations`} icon="event_available" label="Reservations" />
              <QuickActionCompact href={`/${slug}/floor-plan`} icon="table_restaurant" label="Floor plan" />
              <QuickActionCompact href={`/${slug}/terminal`} icon="point_of_sale" label="POS Terminal" />
              <QuickActionCompact href={`/${slug}/qr`} icon="qr_code" label="QR codes" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
