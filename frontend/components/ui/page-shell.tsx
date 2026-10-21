import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';

export function PageHeader({
  title,
  description,
  actions,
  badge,
  icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: string;
  icon?: string;
}) {
  return (
    <div className="page-header-block flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between w-full min-w-0">
      <div className="flex gap-4 min-w-0 flex-1">
        {icon && (
          <div
            className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-[#3d8a7e] text-on-primary flex items-center justify-center shadow-lg shadow-primary/25"
          >
            <Icon name={icon} className="text-2xl" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight break-words">
              {title}
            </h1>
            {badge && (
              <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-on-primary font-bold">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm md:text-base text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low/40 ${
        compact ? 'py-10 px-4' : 'py-14 px-6'
      }`}
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon name={icon} className="text-3xl text-primary" />
      </div>
      <h3 className="font-body-emphasis text-lg text-on-surface mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mb-5 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

export function DataPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`app-data-panel rounded-2xl border-2 border-outline-variant/10 bg-white overflow-hidden w-full min-w-0 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`rounded-2xl border-2 border-outline-variant/10 bg-white overflow-hidden shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 border-b border-outline-variant/10 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="min-w-0">
            {title && <h3 className="font-bold text-primary text-base">{title}</h3>}
            {description && (
              <p className="font-caption text-on-surface-variant mt-0.5 text-xs">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName || 'p-4 md:p-5'}>{children}</div>
    </section>
  );
}

export function FilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 p-3 md:p-4 rounded-xl border-2 border-outline-variant/10 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function MetricPill({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon?: string;
  tone?: 'default' | 'primary' | 'warning' | 'success';
}) {
  const tones = {
    default: 'bg-surface-container-low border-outline-variant/15 text-on-surface',
    primary: 'bg-primary/10 border-primary/20 text-primary',
    warning: 'bg-secondary-fixed/50 border-secondary/20 text-on-secondary-fixed-variant',
    success: 'bg-tertiary-fixed/40 border-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[120px] ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</p>
        {icon && <Icon name={icon} className="text-lg opacity-60" />}
      </div>
      <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
