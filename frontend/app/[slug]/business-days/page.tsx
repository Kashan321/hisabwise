'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { BusinessDayPowerButton } from '@/components/business-day/business-day-controls';
import { Icon, Spinner } from '@/components/ui';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import type { BusinessDay } from '@/lib/api/types';
import {
  useBusinessDaySummary,
  useBusinessDays,
  useCurrentBusinessDay,
} from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';

function formatBusinessDateLabel(businessDate: string): string {
  return new Date(`${businessDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sessionCountLabel(day: BusinessDay): string {
  const openCount = day.openCount ?? 1;
  const closeCount = day.closeCount ?? 0;
  const openLabel = openCount === 1 ? 'Opened once' : `Opened ${openCount} times`;
  const closeLabel =
    closeCount === 0
      ? 'Not closed yet'
      : closeCount === 1
        ? 'Closed once'
        : `Closed ${closeCount} times`;

  if (day.status === 'OPEN' && closeCount > 0) {
    return `${openLabel} · ${closeLabel} · open again`;
  }

  return `${openLabel} · ${closeLabel}`;
}

function dayDurationLabel(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const start = new Date(startedAt).getTime();
  const minutes = Math.max(0, Math.floor((end - start) / 60_000));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function StatusBadge({ status }: { status: BusinessDay['status'] }) {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase text-violet-800">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-pulse" />
        Open
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
      Closed
    </span>
  );
}

function BusinessDayDetail({ businessDayId }: { businessDayId: string }) {
  const formatMoney = useFormatMoney();
  const { data: summary, isLoading } = useBusinessDaySummary(businessDayId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-5 text-sm text-on-surface-variant">
        <Spinner className="h-4 w-4" />
        Loading day details…
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="border-t border-outline-variant/10 bg-surface-container-low/40 px-4 py-4 md:px-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-xl mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Orders
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-primary">{summary.orderCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Total sales
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-primary">
            {formatMoney(summary.totalSales)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Shifts
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-primary">{summary.shifts.length}</p>
        </div>
      </div>

      {summary.shifts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Shifts this day
          </p>
          {summary.shifts.map((shift, index) => (
            <div
              key={shift.shiftId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant/10 bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-primary">Shift {index + 1} · {shift.openedByName}</p>
                <p className="text-xs text-on-surface-variant">
                  {formatTime(shift.openedAt)}
                  {shift.closedAt ? ` – ${formatTime(shift.closedAt)}` : ' · still open'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-primary">{formatMoney(shift.sales)}</p>
                <p className="text-xs text-on-surface-variant">{shift.orderCount} orders</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessDayRow({ day }: { day: BusinessDay }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="border-b border-outline-variant/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full px-4 py-4 text-left transition-colors hover:bg-surface-container-low/50 md:px-5"
      >
        <div className="flex flex-wrap items-start gap-3 md:gap-4">
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            className="mt-1 shrink-0 text-on-surface-variant"
          />

          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-body-emphasis text-primary">{formatBusinessDateLabel(day.businessDate)}</p>
              <StatusBadge status={day.status} />
            </div>
            <p className="mt-1 font-caption text-on-surface-variant">
              {sessionCountLabel(day)} · {dayDurationLabel(day.startedAt, day.endedAt)}
            </p>
            {(day.openCount ?? 1) > 1 && (
              <p className="mt-1 text-xs text-on-surface-variant">
                First opened {formatDateTime(day.startedAt)}
              </p>
            )}
          </div>

          <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-2 sm:gap-8">
            <div className="min-w-[150px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                {(day.openCount ?? 1) > 1 ? 'Last opened' : 'Opened'}
              </p>
              <p className="mt-1 text-sm font-medium text-primary">
                {day.openedByName ?? 'Unknown'}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {formatDateTime(day.lastOpenedAt ?? day.startedAt)}
              </p>
            </div>

            <div className="min-w-[150px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Closed
              </p>
              {day.status === 'CLOSED' && day.endedAt ? (
                <>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {day.closedByName ?? 'Unknown'}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{formatDateTime(day.endedAt)}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-on-surface-variant">—</p>
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && <BusinessDayDetail businessDayId={day.id} />}
    </article>
  );
}

export default function BusinessDaysPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: currentDayState } = useCurrentBusinessDay();
  const currentDay = currentDayState?.businessDay;
  const { data: days, isLoading } = useBusinessDays(50);

  const openCount = (days ?? []).filter((day) => day.status === 'OPEN').length;
  const closedCount = (days ?? []).filter((day) => day.status === 'CLOSED').length;

  return (
    <BusinessLayout slug={slug} title="Business Days">
      <PageHeader
        title="Business Days"
        description="History of operating days. Each business day groups orders, shifts, and reports — not calendar midnight."
        icon="today"
        actions={<BusinessDayPowerButton />}
      />

      {currentDay && (
        <div className="mb-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                Current business day
              </p>
              <p className="mt-1 text-xl font-bold text-violet-900">
                {formatBusinessDateLabel(currentDay.businessDate)}
              </p>
              <p className="mt-2 text-sm text-violet-800">
                {sessionCountLabel(currentDay)}
              </p>
              <p className="mt-1 text-sm text-violet-800">
                Last opened by <strong>{currentDay.openedByName ?? 'Unknown'}</strong> at{' '}
                {formatDateTime(currentDay.lastOpenedAt ?? currentDay.startedAt)}
              </p>
            </div>
            <StatusBadge status="OPEN" />
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
        <span>{openCount} open</span>
        <span>·</span>
        <span>{closedCount} closed</span>
        <span>·</span>
        <span>{(days ?? []).length} total</span>
        <Link href={`/${slug}/shifts`} className="ml-auto font-medium text-secondary hover:underline">
          View shift history
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-white shadow-sm">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-on-surface-variant">
            <Spinner className="h-4 w-4" />
            Loading business days…
          </div>
        )}

        {!isLoading && (days ?? []).length === 0 && (
          <EmptyState
            icon="today"
            title="No business days yet"
            description="Open your first business day from the header to start taking orders and running shifts."
          />
        )}

        {(days ?? []).map((day) => (
          <BusinessDayRow key={day.id} day={day} />
        ))}
      </div>
    </BusinessLayout>
  );
}
