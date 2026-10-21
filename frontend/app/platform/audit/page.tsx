'use client';

import Link from 'next/link';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { Icon, TableSkeleton } from '@/components/ui';
import { usePlatformAuditLogs } from '@/lib/hooks/queries';

function auditStatusBadge(action: string) {
  const pending = action.toLowerCase().includes('pending') || action.toLowerCase().includes('disabled');
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

export default function PlatformAuditPage() {
  const { data: logs = [], isLoading } = usePlatformAuditLogs();

  return (
    <PlatformLayout title="Audit Logs">
      <section className="bg-surface-bright rounded-lg border-hairline overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface">Audit Activity</h2>
            <p className="font-caption text-on-surface-variant mt-0.5">
              Complete platform action history and compliance trail
            </p>
          </div>
          <button
            type="button"
            className="text-secondary font-body-emphasis text-caption hover:underline transition-all cursor-pointer"
          >
            Export Report
          </button>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={8} cols={5} />
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
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-6 py-4 font-mono text-[13px] text-on-surface-variant">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0" />
                        <span className="font-body-emphasis">{log.platformUser.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface">{log.action}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {log.targetType}
                      {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ''}
                    </td>
                    <td className="px-6 py-4">{auditStatusBadge(log.action)}</td>
                  </tr>
                ))}
                {logs.length === 0 && !isLoading && (
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
            Showing {logs.length.toLocaleString()} entries
          </p>
          <Link
            href="/platform"
            className="flex items-center gap-1 text-secondary font-caption hover:underline"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            Back to Overview
          </Link>
        </div>
      </section>
    </PlatformLayout>
  );
}
