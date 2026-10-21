import type { ReactNode } from 'react';
import Link from 'next/link';

export function Icon({
  name,
  filled,
  className = '',
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

export function StatusChip({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: 'received' | 'preparing' | 'ready' | 'success' | 'neutral' | 'error';
}) {
  const styles: Record<string, string> = {
    received: 'bg-surface-container-highest text-on-surface-variant',
    preparing: 'bg-secondary-fixed text-on-secondary-fixed',
    ready: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    success: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    neutral: 'bg-surface-container-high text-on-surface-variant',
    error: 'bg-error-container text-on-error-container',
  };
  const display = label.replace(/_/g, ' ');
  return (
    <span
      className={`px-2 py-0.5 rounded font-caption text-[10px] uppercase tracking-tighter ${styles[variant]}`}
    >
      {display}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  badge,
  icon,
  progress,
  dense = false,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  badge?: ReactNode;
  icon?: string;
  progress?: number;
  /** Tighter layout for narrow columns (e.g. currency amounts). */
  dense?: boolean;
}) {
  return (
    <div
      className={`min-w-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 flex flex-col gap-1 group hover:border-secondary/30 transition-all shadow-sm shadow-primary/[0.02] ${
        dense ? 'p-3 sm:p-4' : 'p-3 sm:p-4 md:p-5'
      }`}
    >
      <div className="flex justify-between items-start gap-2 mb-1 min-w-0">
        <span
          className={`font-caption text-on-surface-variant uppercase tracking-wider text-[10px] leading-snug ${
            dense ? 'line-clamp-2' : 'truncate'
          }`}
          title={label}
        >
          {label}
        </span>
        {badge}
        {icon && (
          <Icon
            name={icon}
            className={`text-on-surface-variant/50 shrink-0 ${dense ? 'text-base' : 'text-lg'}`}
          />
        )}
      </div>
      <span
        className={`font-bold text-primary tracking-tight tabular-nums leading-snug min-w-0 block break-words ${
          dense ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'
        }`}
      >
        {value}
      </span>
      {progress !== undefined && (
        <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-secondary rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
      {sub && !progress && <p className="font-caption text-on-surface-variant mt-2">{sub}</p>}
      {sub && progress !== undefined && (
        <p className="font-caption text-on-surface-variant mt-1">{sub}</p>
      )}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-container-high/90 ${className}`}
      aria-hidden
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="border-b border-outline-variant/10">
          {Array.from({ length: cols }).map((_, col) => (
            <td key={col} className="px-6 py-4">
              <Skeleton
                className={`h-4 ${col === cols - 1 ? 'ml-auto w-20' : 'w-full max-w-[140px]'}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 md:p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 flex flex-col gap-3 shadow-sm">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="min-w-[200px] p-4 bg-surface-container-lowest rounded-xl card-hairline border border-outline-variant/20 space-y-3 shrink-0">
      <div className="flex justify-between gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function ListCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest space-y-2"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function ActivitySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 items-start">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 pb-4 border-b border-outline-variant/10">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  loading?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-body-emphasis rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-primary text-on-primary hover:opacity-90 px-6 py-2.5',
    secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90 px-6 py-2.5 active:scale-95',
    ghost: 'text-on-surface-variant hover:bg-surface-container-low px-4 py-2',
    outline:
      'border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container px-4 py-2',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = '',
  loading,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      className={`inline-flex items-center justify-center p-1.5 rounded transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner className="h-5 w-5" /> : children}
    </button>
  );
}

export function Input({
  label,
  hint,
  className = '',
  dense,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; dense?: boolean }) {
  return (
    <div className={dense ? 'space-y-0.5' : 'space-y-1.5'}>
      {label && (
        <label
          className={`font-bold text-on-surface-variant block ${
            dense ? 'text-[10px] leading-none' : 'font-caption'
          }`}
        >
          {label}
        </label>
      )}
      <input
        className={`w-full h-11 px-4 bg-surface border border-outline-variant/30 rounded-lg font-body-base transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none ${className}`}
        {...props}
      />
      {hint && <p className="font-caption text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="font-caption text-on-surface-variant font-bold block">{label}</label>
      )}
      <textarea
        className={`w-full px-4 py-3 bg-surface border border-outline-variant/30 rounded-lg font-body-base transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none resize-none ${className}`}
        {...props}
      />
    </div>
  );
}

export function SelectField({
  label,
  options,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="font-caption text-on-surface-variant font-bold block">{label}</label>
      )}
      <select
        className={`w-full h-11 px-4 bg-surface border border-outline-variant/30 rounded-lg font-body-base focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NavLink({
  href,
  icon,
  label,
  active,
  onClick,
  onDark,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 tap-target ${
        onDark
          ? active
            ? 'bg-white/15 text-white font-body-emphasis shadow-inner'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
          : active
            ? 'bg-primary text-on-primary font-body-emphasis shadow-sm shadow-primary/20'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <Icon name={icon} filled={active} />
      <span>{label}</span>
    </Link>
  );
}

export function orderStatusVariant(
  status: string,
): 'received' | 'preparing' | 'ready' | 'success' | 'neutral' | 'error' {
  const map: Record<string, 'received' | 'preparing' | 'ready' | 'success'> = {
    RECEIVED: 'received',
    PREPARING: 'preparing',
    READY: 'ready',
    COMPLETED: 'success',
  };
  return map[status] ?? 'neutral';
}

export function orderBorderAccent(status: string): string {
  const map: Record<string, string> = {
    PREPARING: 'border-l-secondary',
    READY: 'border-l-tertiary-fixed-dim',
    RECEIVED: 'border-l-outline-variant',
  };
  return map[status] ?? 'border-l-outline-variant';
}

export function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export {
  DataTable,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeadCell,
  DataTableCell,
  DataTableLoading,
  DataTableEmpty,
  DataTableError,
  DataTableActions,
  DataTablePrimaryCell,
  DataTableMoneyCell,
} from '@/components/ui/data-table';
export type { DataTableVariant, DataTableRowAccent } from '@/components/ui/data-table';
export { PasswordInput } from '@/components/ui/password-input';
