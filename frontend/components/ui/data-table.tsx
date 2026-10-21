'use client';

import type { ReactNode } from 'react';
import { DataPanel } from '@/components/ui/page-shell';

type Align = 'left' | 'right' | 'center';

function alignClass(align: Align) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

export type DataTableVariant = 'classic' | 'cards';

export function DataTable({
  children,
  className = '',
  minWidth = '640px',
  footer,
  embedded = false,
  variant = 'cards',
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
  footer?: ReactNode;
  /** Use inside an existing panel/card without adding another border shell. */
  embedded?: boolean;
  variant?: DataTableVariant;
}) {
  const tableClass = variant === 'cards' ? 'data-table data-table--cards' : 'data-table';
  const table = (
    <>
      <div className="table-scroll-shell data-table-shell">
        <table className={tableClass} style={{ minWidth }}>{children}</table>
      </div>
      {footer ? (
        <div className="px-5 py-3 border-t border-outline-variant/10 bg-surface-container-low/40 text-sm text-on-surface-variant">
          {footer}
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className={`app-data-panel overflow-hidden ${className}`}>{table}</div>;
  }

  return <DataPanel className={className}>{table}</DataPanel>;
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export type DataTableRowAccent = 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'neutral';

export function DataTableRow({
  children,
  onClick,
  className = '',
  muted,
  accent = 'neutral',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  muted?: boolean;
  accent?: DataTableRowAccent;
}) {
  return (
    <tr
      onClick={onClick}
      data-accent={accent}
      className={[
        'data-table-row',
        onClick ? 'cursor-pointer' : '',
        muted ? 'data-table-row--muted' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </tr>
  );
}

export function DataTableHeadCell({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode;
  align?: Align;
  className?: string;
}) {
  return <th className={`${alignClass(align)} ${className}`.trim()}>{children}</th>;
}

export function DataTableCell({
  children,
  align = 'left',
  className = '',
  colSpan,
}: {
  children: ReactNode;
  align?: Align;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`${alignClass(align)} ${className}`.trim()}>
      {children}
    </td>
  );
}

export function DataTableLoading({ rows = 5, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <DataTableRow key={row}>
          {Array.from({ length: cols }).map((_, col) => (
            <DataTableCell key={col}>
              <div
                className={`h-4 animate-pulse rounded-md bg-surface-container-high/90 ${
                  col === cols - 1 ? 'ml-auto w-20' : 'w-full max-w-[140px]'
                }`}
              />
            </DataTableCell>
          ))}
        </DataTableRow>
      ))}
    </>
  );
}

export function DataTableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <DataTableRow>
      <DataTableCell colSpan={colSpan} className="!py-14 text-center font-caption text-on-surface-variant">
        {children}
      </DataTableCell>
    </DataTableRow>
  );
}

export function DataTableError({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <DataTableRow>
      <DataTableCell colSpan={colSpan} className="!py-14 text-center font-caption text-error">
        {message}
      </DataTableCell>
    </DataTableRow>
  );
}

export function DataTableActions({ children }: { children: ReactNode }) {
  return (
    <div className="data-table-actions inline-flex items-center justify-end gap-1 flex-wrap">
      {children}
    </div>
  );
}

export function DataTablePrimaryCell({ children }: { children: ReactNode }) {
  return <span className="data-table-primary-cell">{children}</span>;
}

export function DataTableMoneyCell({ children }: { children: ReactNode }) {
  return <span className="data-table-money-cell">{children}</span>;
}
