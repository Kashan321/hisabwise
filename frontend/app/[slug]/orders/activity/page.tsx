'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { formatTenantAuditAction } from '@/lib/audit-log-display';
import { Icon, SelectField, TableSkeleton } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { useTenantAuditLogs } from '@/lib/hooks/queries';

const PAGE_SIZE = 50;

const TARGET_FILTERS = [
  { value: '', label: 'All resources' },
  { value: 'order', label: 'Orders' },
  { value: 'table', label: 'Tables' },
  { value: 'delivery', label: 'Delivery' },
];

const EVENT_FILTERS = [
  { value: '', label: 'All events' },
  { value: 'order.cancelled', label: 'Order cancellations' },
  { value: 'cancel', label: 'Any action containing “cancel”' },
];

export default function OrderActivityLogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [page, setPage] = useState(0);
  const [targetType, setTargetType] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  const offset = page * PAGE_SIZE;
  const action =
    eventFilter && eventFilter !== 'cancel' ? eventFilter : undefined;
  const actionContains = eventFilter === 'cancel' ? 'cancel' : undefined;

  const { data, isLoading, isFetching } = useTenantAuditLogs({
    limit: PAGE_SIZE,
    offset,
    targetType: targetType || undefined,
    action,
    actionContains,
  });

  const logs = data?.logs ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rangeLabel = useMemo(() => {
    if (total === 0) return '0 entries';
    const from = offset + 1;
    const to = Math.min(offset + logs.length, total);
    return `${from}–${to} of ${total.toLocaleString()}`;
  }, [offset, logs.length, total]);

  return (
    <BusinessLayout slug={slug} title="Service activity log">
      <PageHeader
        title="Service activity log"
        description="Order, table, and delivery actions recorded for your restaurant."
        actions={
          <Link
            href={`/${slug}/orders`}
            className="inline-flex items-center gap-1 text-secondary font-body-emphasis text-sm hover:underline"
          >
            <Icon name="arrow_back" className="text-base" />
            Back to orders
          </Link>
        }
      />

      <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-outline-variant/15 flex flex-col sm:flex-row sm:items-end gap-3 justify-between flex-wrap">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <SelectField
              label="Event"
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPage(0);
              }}
              options={EVENT_FILTERS}
              className="max-w-xs"
            />
            <SelectField
              label="Resource"
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value);
                setPage(0);
              }}
              options={TARGET_FILTERS}
              className="max-w-xs"
            />
          </div>
          <p className="font-caption text-on-surface-variant">{rangeLabel}</p>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={10} cols={5} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-4 sm:px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 sm:px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-4 sm:px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 sm:px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 sm:px-6 py-3 font-caption text-on-surface-variant uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <p className="font-body-emphasis text-sm">{log.user.name}</p>
                      <p className="font-caption text-on-surface-variant">{log.user.email}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-on-surface">
                      {formatTenantAuditAction(log.action)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-on-surface-variant capitalize">
                      {log.targetType}
                    </td>
                    <td className="px-4 sm:px-6 py-3 font-mono text-xs text-on-surface-variant">
                      {log.targetId ? log.targetId.slice(0, 8) : '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !isLoading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 font-caption text-center text-on-surface-variant"
                    >
                      No activity in this filter yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="px-4 sm:px-6 py-4 border-t border-outline-variant/15 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={page <= 0 || isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="font-caption text-secondary disabled:opacity-40 hover:underline cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="font-caption text-on-surface-variant">
              Page {page + 1} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pageCount || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="font-caption text-secondary disabled:opacity-40 hover:underline cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </BusinessLayout>
  );
}
