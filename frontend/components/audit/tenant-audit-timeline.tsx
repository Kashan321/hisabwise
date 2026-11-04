'use client';

import { Icon } from '@/components/ui';
import type { TenantAuditLog } from '@/lib/api/types';
import { auditLogIcon, formatTenantAuditAction } from '@/lib/audit-log-display';
import { timeAgo } from '@/components/orders/order-badges';

export function TenantAuditTimeline({
  logs,
  compact = false,
}: {
  logs: TenantAuditLog[];
  compact?: boolean;
}) {
  if (logs.length === 0) {
    return (
      <p className="font-caption text-on-surface-variant py-2">No activity recorded yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-outline-variant/30" />
      {logs.map((log, i) => (
        <div key={log.id} className="flex gap-4 relative">
          <div
            className={`z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
              i === 0
                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                : i === 1
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'bg-surface-container-highest text-outline'
            }`}
          >
            <Icon name={auditLogIcon(log.action)} className="text-[18px]" />
          </div>
          <div
            className={`flex-1 ${compact ? 'pb-3 border-b border-outline-variant/10' : 'pb-4 border-b border-outline-variant/10'}`}
          >
            <p className="font-body-base">{formatTenantAuditAction(log.action)}</p>
            <p className="font-caption text-on-surface-variant mt-0.5">
              {log.user.name} · {timeAgo(log.createdAt)}
            </p>
            {!compact && log.targetType && (
              <p className="font-caption text-outline mt-1">
                {log.targetType}
                {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ''}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
