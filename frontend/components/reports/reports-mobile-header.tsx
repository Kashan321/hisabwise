'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';

export function ReportsMobileHeader({
  title,
  badge,
  actions,
}: {
  title: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="md:hidden mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[#3d8a7e] text-on-primary flex items-center justify-center shadow-md shadow-primary/20">
            <Icon name="analytics" className="text-lg" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-primary leading-tight truncate">{title}</h1>
            {badge && (
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mt-0.5 truncate">
                {badge}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
