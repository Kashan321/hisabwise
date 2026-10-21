'use client';

import { useMemo, useState } from 'react';
import { Input, SelectField } from '@/components/ui';
import { DataPanel } from '@/components/ui/page-shell';
import type { ReportFilters as ApiReportFilters } from '@/lib/api/types';
import { useCurrentBusinessDay } from '@/lib/hooks/queries';
import {
  formatReportRangeLabel,
  getReportPresetRange,
  resolveTodayBusinessDateContext,
  type ReportPreset,
} from '@/lib/report-dates';

const PRESETS: { id: ReportPreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
];

export type ReportFilterConfig = {
  date?: boolean;
  orderType?: boolean;
  paymentMethod?: boolean;
  employee?: boolean;
  category?: boolean;
  product?: boolean;
  table?: boolean;
  rider?: boolean;
  inventoryItem?: boolean;
  supplier?: boolean;
  search?: boolean;
  sort?: boolean;
};

type Option = { value: string; label: string };

interface ReportFiltersProps {
  config: ReportFilterConfig;
  value: ApiReportFilters;
  onChange: (next: ApiReportFilters) => void;
  employees?: Option[];
  categories?: Option[];
  products?: Option[];
  tables?: Option[];
  riders?: Option[];
  inventoryItems?: Option[];
}

export function useReportFilterState(initialPreset: ReportPreset = 'today') {
  const { data: currentBusinessDayState } = useCurrentBusinessDay();
  const currentBusinessDay = resolveTodayBusinessDateContext(currentBusinessDayState);
  const [preset, setPreset] = useState<ReportPreset>(initialPreset);
  const [useCustom, setUseCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [extra, setExtra] = useState<Partial<ApiReportFilters>>({});

  const filters: ApiReportFilters = useMemo(() => {
    const range =
      useCustom && customFrom && customTo
        ? { from: customFrom, to: customTo }
        : getReportPresetRange(preset, currentBusinessDay);
    return { ...range, ...extra };
  }, [preset, useCustom, customFrom, customTo, extra, currentBusinessDay]);

  const rangeLabel =
    filters.from && filters.to ? formatReportRangeLabel(filters.from, filters.to) : '';

  return {
    preset,
    setPreset,
    useCustom,
    setUseCustom,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    extra,
    setExtra,
    filters,
    rangeLabel,
  };
}

export function ReportFiltersBar({
  config,
  value,
  onChange,
  employees = [],
  categories = [],
  products = [],
  tables = [],
  riders = [],
  inventoryItems = [],
  preset,
  setPreset,
  useCustom,
  setUseCustom,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: ReportFiltersProps & {
  preset: ReportPreset;
  setPreset: (p: ReportPreset) => void;
  useCustom: boolean;
  setUseCustom: (v: boolean) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}) {
  function patch(partial: Partial<ApiReportFilters>) {
    onChange({ ...value, ...partial });
  }

  const hasExtraFilters =
    config.orderType ||
    config.paymentMethod ||
    config.employee ||
    config.category ||
    config.product ||
    config.table ||
    config.rider ||
    config.inventoryItem ||
    config.supplier ||
    config.search ||
    config.sort;

  const presetButtonClass = (active: boolean, compact?: boolean) => {
    const size = compact ? 'px-2.5 py-1.5 text-xs shrink-0 snap-start' : 'px-3 py-1.5';
    const state = active
      ? 'bg-primary text-on-primary'
      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container';
    return `${size} rounded-lg font-caption transition-all cursor-pointer ${state}`;
  };

  return (
    <DataPanel className="!p-3 md:!p-5">
      <div className="flex flex-col gap-3 md:gap-4">
        {config.date && (
          <div className="flex flex-col gap-2 md:gap-3">
            <p className="font-caption text-on-surface-variant uppercase tracking-wider text-[10px]">
              Date range
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 snap-x snap-mandatory hide-scrollbar md:flex-wrap md:overflow-visible md:gap-2">
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPreset(item.id);
                    setUseCustom(false);
                  }}
                  className={presetButtonClass(!useCustom && preset === item.id, true)}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={presetButtonClass(useCustom, true)}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-auto min-w-[140px]"
                />
                <span className="text-on-surface-variant font-caption">to</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-auto min-w-[140px]"
                />
              </div>
            )}
          </div>
        )}

        {hasExtraFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-outline-variant/10">
            {config.orderType && (
              <SelectField
                label="Order type"
                value={value.orderType ?? ''}
                onChange={(e) => patch({ orderType: e.target.value || undefined })}
                options={[
                  { value: '', label: 'All types' },
                  { value: 'DINE_IN', label: 'Dine-in' },
                  { value: 'TAKEAWAY', label: 'Takeaway' },
                  { value: 'DELIVERY', label: 'Delivery' },
                  { value: 'QR', label: 'QR order' },
                ]}
              />
            )}
            {config.paymentMethod && (
              <SelectField
                label="Payment method"
                value={value.paymentMethod ?? ''}
                onChange={(e) => patch({ paymentMethod: e.target.value || undefined })}
                options={[
                  { value: '', label: 'All methods' },
                  { value: 'CASH', label: 'Cash' },
                  { value: 'CARD', label: 'Card' },
                  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
                  { value: 'WALLET', label: 'Wallet' },
                  { value: 'ONLINE', label: 'Online' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            )}
            {config.employee && employees.length > 0 && (
              <SelectField
                label="Employee"
                value={value.employeeId ?? ''}
                onChange={(e) => patch({ employeeId: e.target.value || undefined })}
                options={[{ value: '', label: 'All employees' }, ...employees]}
              />
            )}
            {config.category && categories.length > 0 && (
              <SelectField
                label="Category"
                value={value.categoryId ?? ''}
                onChange={(e) => patch({ categoryId: e.target.value || undefined })}
                options={[{ value: '', label: 'All categories' }, ...categories]}
              />
            )}
            {config.product && products.length > 0 && (
              <SelectField
                label="Product"
                value={value.menuItemId ?? ''}
                onChange={(e) => patch({ menuItemId: e.target.value || undefined })}
                options={[{ value: '', label: 'All products' }, ...products]}
              />
            )}
            {config.table && tables.length > 0 && (
              <SelectField
                label="Table"
                value={value.tableId ?? ''}
                onChange={(e) => patch({ tableId: e.target.value || undefined })}
                options={[{ value: '', label: 'All tables' }, ...tables]}
              />
            )}
            {config.rider && riders.length > 0 && (
              <SelectField
                label="Rider"
                value={value.riderId ?? ''}
                onChange={(e) => patch({ riderId: e.target.value || undefined })}
                options={[{ value: '', label: 'All riders' }, ...riders]}
              />
            )}
            {config.inventoryItem && inventoryItems.length > 0 && (
              <SelectField
                label="Inventory item"
                value={value.inventoryItemId ?? ''}
                onChange={(e) => patch({ inventoryItemId: e.target.value || undefined })}
                options={[{ value: '', label: 'All items' }, ...inventoryItems]}
              />
            )}
            {config.supplier && (
              <Input
                label="Supplier"
                placeholder="Filter by supplier"
                value={value.supplier ?? ''}
                onChange={(e) => patch({ supplier: e.target.value || undefined })}
              />
            )}
            {config.search && (
              <Input
                label="Search"
                placeholder="Order #, customer, phone…"
                value={value.search ?? ''}
                onChange={(e) => patch({ search: e.target.value || undefined })}
              />
            )}
            {config.sort && (
              <SelectField
                label="Sort by"
                value={value.sort ?? 'quantity'}
                onChange={(e) =>
                  patch({ sort: (e.target.value as 'quantity' | 'revenue') || 'quantity' })
                }
                options={[
                  { value: 'quantity', label: 'Most sold' },
                  { value: 'revenue', label: 'Highest revenue' },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </DataPanel>
  );
}
