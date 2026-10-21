'use client';

import {
  Button,
  Icon,
  StatCard,
  StatCardSkeleton,
  DataTable,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeadCell,
  DataTableCell,
  DataTableLoading,
} from '@/components/ui';
import { DataPanel, EmptyState } from '@/components/ui/page-shell';
import { useExportAnalyticsReport } from '@/lib/hooks/mutations';
import { useBusiness, useReceiptTemplate } from '@/lib/hooks/queries';
import { downloadCsv } from '@/lib/report-dates';
import { hasReportPrintData, printReport, type ReportPrintInput } from '@/lib/report-print';
import { useToast } from '@/lib/toast';
import { formatApiError } from '@/lib/api/errors';
import type { ReportFilters } from '@/lib/api/types';

export function BarChart({
  items,
  valueKey,
  labelKey,
  formatValue,
  formatBarTitle,
}: {
  items: Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
  formatValue?: (v: number) => string;
  formatBarTitle?: (item: Record<string, string | number>, value: number) => string;
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey])), 1);
  if (items.length === 0) return null;

  return (
    <div className="flex items-end gap-1 h-44 pt-4 overflow-x-auto pb-1">
      {items.map((item, idx) => {
        const amount = Number(item[valueKey]);
        const height = amount > 0 ? Math.max(8, Math.round((amount / max) * 100)) : 4;
        const label = String(item[labelKey]);
        const title = formatBarTitle
          ? formatBarTitle(item, amount)
          : formatValue
            ? formatValue(amount)
            : String(amount);
        return (
          <div key={idx} className="flex-1 min-w-[40px] max-w-[72px] flex flex-col items-center gap-1.5 group">
            <div className="relative w-full flex justify-center items-end h-28">
              <div
                className={`w-full max-w-[28px] rounded-t transition-all ${
                  amount > 0 ? 'bg-secondary group-hover:bg-secondary/80' : 'bg-outline-variant/30'
                }`}
                style={{ height: `${height}%` }}
                title={title}
              />
            </div>
            <span
              className="font-caption text-[10px] text-on-surface-variant w-full text-center leading-tight line-clamp-2 break-words"
              title={label}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportTable({
  headers,
  rows,
  loading,
  emptyMessage = 'No data found for this date range.',
  onRowClick,
}: {
  headers: string[];
  rows: Array<Array<string | number | null>>;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (index: number) => void;
}) {
  if (rows.length === 0 && !loading) {
    return (
      <EmptyState icon="analytics" title={emptyMessage} description="Try a different date range." />
    );
  }

  return (
    <DataTable minWidth="640px" embedded variant="classic">
      <DataTableHead>
        <DataTableRow>
          {headers.map((h) => (
            <DataTableHeadCell key={h}>{h}</DataTableHeadCell>
          ))}
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {loading && <DataTableLoading rows={6} cols={headers.length} />}
        {!loading &&
          rows.map((row, ri) => (
            <DataTableRow key={ri} onClick={onRowClick ? () => onRowClick(ri) : undefined}>
              {row.map((cell, ci) => (
                <DataTableCell key={ci} className="whitespace-nowrap">
                  {cell ?? '—'}
                </DataTableCell>
              ))}
            </DataTableRow>
          ))}
      </DataTableBody>
    </DataTable>
  );
}

export function ReportStatGrid({
  stats,
  loading,
  formatMoney,
}: {
  stats: Array<{ label: string; value: string | number }>;
  loading?: boolean;
  formatMoney?: (v: string | number) => string;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 [&>*]:min-w-0">
        {Array.from({ length: Math.min(stats.length || 8, 8) }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 [&>*]:min-w-0">
      {stats.map((s) => (
        <StatCard
          key={s.label}
          dense
          label={s.label}
          value={
            formatMoney &&
            typeof s.value === 'string' &&
            /^-?\d+(\.\d+)?$/.test(String(s.value))
              ? formatMoney(s.value)
              : String(s.value)
          }
        />
      ))}
    </div>
  );
}

export function PrintReportButton({
  printInput,
  disabled,
}: {
  printInput: ReportPrintInput;
  disabled?: boolean;
}) {
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();
  const toast = useToast();
  const canPrint = hasReportPrintData(printInput);

  function handlePrint() {
    try {
      printReport({
        ...printInput,
        businessName: business?.name,
        businessLocation: business?.location,
        widthMm: receiptTemplate?.receiptWidthMm ?? 80,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to print report');
    }
  }

  return (
    <Button variant="outline" disabled={disabled || !canPrint} onClick={handlePrint}>
      <Icon name="print" className="text-lg" />
      Print report
    </Button>
  );
}

export function ExportReportButton({
  exportType,
  filters,
}: {
  exportType: string;
  filters: ReportFilters;
}) {
  const exportReport = useExportAnalyticsReport();
  const toast = useToast();

  async function handleExport() {
    try {
      const result = await exportReport.mutateAsync({ type: exportType, filters });
      downloadCsv(result.csv, result.filename);
      toast.success('Report exported');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <Button variant="outline" loading={exportReport.isPending} onClick={handleExport}>
      <Icon name="file_download" className="text-lg" />
      Export CSV
    </Button>
  );
}

export function ReportPanel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <DataPanel>
      {title && <h3 className="font-title text-base text-on-surface px-4 pt-4 pb-3 md:px-5 md:pt-5">{title}</h3>}
      <div className="px-4 pb-4 md:px-5 md:pb-5">{children}</div>
    </DataPanel>
  );
}
