'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { CompleteOrderPaymentModal } from '@/components/orders/complete-order-payment-modal';
import { OrderDetailDrawer } from '@/components/orders/order-detail-drawer';
import { OrderRowActions } from '@/components/orders/order-row-actions';
import {
  OrderSourceBadge,
  OrderStatusBadge,
  OrderTypeBadge,
  formatOrderTypeLabel,
  orderServiceSummary,
  PaymentMethodBadge,
  OrderItemsSummary,
  orderActionLabel,
  orderNextStatus,
  timeAgo,
} from '@/components/orders/order-badges';
import {
  Button,
  Icon,
  Input,
  SelectField,
  ActivitySkeleton,
  Textarea,
  DataTable,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeadCell,
  DataTableCell,
  DataTableLoading,
  DataTableEmpty,
  DataTableError,
  DataTablePrimaryCell,
  DataTableMoneyCell,
} from '@/components/ui';
import type { DataTableRowAccent } from '@/components/ui';
import { ConfirmDialog, Drawer } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import type { OrderListFilters } from '@/lib/api/types';
import { useCreateOrder, useUpdateOrderStatus } from '@/lib/hooks/mutations';
import { useCustomers, useCurrentBusinessDay, useFloorTables, useMenu, useOrderFilters, useOrders, usePromotions, useOrder, useBusiness, useReceiptTemplate } from '@/lib/hooks/queries';
import {
  businessTaxRatePercentLabel,
  estimateOrderTotal,
  formatManualDiscountLabel,
  formatPromotionLabel,
  isPromotionApplicable,
  type ManualDiscount,
  DEFAULT_SERVICE_RATE_PERCENT,
  resolveTaxRatePercent,
  resolveTaxRatePercentLabel,
} from '@/lib/order-pricing';
import { receiptPrintPhoneOptions } from '@/lib/business-phones';
import { printOrderReceipt, previewOrderReceipt } from '@/lib/print-order-receipt';
import { useFormatMoney, useBusinessCurrency } from '@/lib/hooks/use-business-currency';
import { usePrintBillPrompt } from '@/lib/hooks/use-print-bill-prompt';
import { useToast } from '@/lib/toast';
import { formatOrderLabel, orderTakerName } from '@/lib/order-display';
import { isMenuItemCustomerSellable } from '@/lib/menu-item-sellability';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';
import { formatReportRangeLabel, getReportPresetRange } from '@/lib/report-dates';
import type { Order } from '@/lib/api/types';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';

type Tab = OrderListFilters['statusGroup'];
type BusyAction = { orderId: string; type: 'print' | 'status' } | null;
type OrderDatePreset = 'today' | 'yesterday' | 'range';

type FilterDraft = {
  datePreset: OrderDatePreset;
  dateFrom: string;
  dateTo: string;
  search: string;
  source: string;
  tableIdentifier: string;
};

function createDefaultFilters(
  currentBusinessDay?: { businessDate: string } | null,
): FilterDraft {
  const today = getReportPresetRange('today', currentBusinessDay);
  return {
    datePreset: 'today',
    dateFrom: today.from,
    dateTo: today.to,
    search: '',
    source: '',
    tableIdentifier: '',
  };
}

const TAB_LABELS: Record<NonNullable<Tab>, string> = {
  all: 'All orders',
  active: 'Active orders',
  completed: 'Completed orders',
  cancelled: 'Cancelled orders',
};

const filterControlClass =
  'w-full h-9 lg:h-11 px-2.5 lg:px-3 bg-surface border border-outline-variant/30 rounded-lg text-sm lg:text-base outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary';

function FilterField({
  label,
  children,
  className = '',
  compact,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <span
        className={`font-caption text-on-surface-variant uppercase tracking-wider ${
          compact ? 'text-[10px]' : ''
        }`}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function StatusTabs({
  tab,
  onChange,
  compact,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex bg-white p-0.5 lg:p-1 rounded-lg lg:rounded-xl border border-outline-variant/10 lg:border-2 shadow-sm ${
        compact ? 'w-full overflow-x-auto' : 'self-start'
      }`}
    >
      {(
        [
          ['all', 'All'],
          ['active', 'Active'],
          ['completed', 'Done'],
          ['cancelled', 'Cancelled'],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`shrink-0 rounded-md lg:rounded-lg font-semibold transition-all cursor-pointer ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
          } ${
            tab === key
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function buildQueryFilters(tab: Tab, applied: FilterDraft): OrderListFilters {
  const filters: OrderListFilters = { statusGroup: tab };

  if (applied.dateFrom) filters.dateFrom = applied.dateFrom;
  if (applied.dateTo) filters.dateTo = applied.dateTo;

  const search = applied.search.trim();
  if (search) filters.search = search;

  if (applied.source) filters.source = applied.source;

  const tableIdentifier = applied.tableIdentifier.trim().replace(/^#/, '');
  if (tableIdentifier) filters.tableIdentifier = tableIdentifier;

  return filters;
}

function orderRowAccent(status: string): DataTableRowAccent {
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'READY') return 'ready';
  if (status === 'PREPARING') return 'preparing';
  if (status === 'RECEIVED') return 'received';
  return 'neutral';
}

function dateFilterLabel(applied: FilterDraft): string {
  if (applied.datePreset === 'range') {
    if (applied.dateFrom && applied.dateTo) {
      return formatReportRangeLabel(applied.dateFrom, applied.dateTo);
    }
    return 'Custom range';
  }
  return applied.datePreset === 'yesterday' ? 'Yesterday' : 'Today';
}

function hasExtraFilters(applied: FilterDraft): boolean {
  return Boolean(applied.search.trim() || applied.source || applied.tableIdentifier.trim());
}

function hasNonDefaultFilters(
  applied: FilterDraft,
  currentBusinessDay?: { businessDate: string } | null,
): boolean {
  const defaults = createDefaultFilters(currentBusinessDay);
  const isDefaultDate =
    applied.datePreset === 'today' &&
    applied.dateFrom === defaults.dateFrom &&
    applied.dateTo === defaults.dateTo;

  return !isDefaultDate || hasExtraFilters(applied);
}

function resolveDatePreset(
  from: string,
  to: string,
  currentBusinessDay?: { businessDate: string } | null,
): OrderDatePreset {
  const today = getReportPresetRange('today', currentBusinessDay);
  const yesterday = getReportPresetRange('yesterday');
  if (from === today.from && to === today.to) return 'today';
  if (from === yesterday.from && to === yesterday.to) return 'yesterday';
  return 'range';
}

function withDateRange(
  filters: FilterDraft,
  from: string,
  to: string,
  currentBusinessDay?: { businessDate: string } | null,
): FilterDraft {
  return {
    ...filters,
    dateFrom: from,
    dateTo: to,
    datePreset: resolveDatePreset(from, to, currentBusinessDay),
  };
}

export default function OrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: currentBusinessDayState } = useCurrentBusinessDay();
  const currentBusinessDay = currentBusinessDayState?.businessDay;
  const [tab, setTab] = useState<Tab>('active');
  const [draftFilters, setDraftFilters] = useState<FilterDraft>(() =>
    createDefaultFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<FilterDraft>(() =>
    createDefaultFilters(),
  );

  useEffect(() => {
    if (!currentBusinessDay?.businessDate) return;
    setDraftFilters((current) => {
      if (current.datePreset !== 'today') return current;
      const next = createDefaultFilters(currentBusinessDay);
      return current.dateFrom === next.dateFrom && current.dateTo === next.dateTo
        ? current
        : next;
    });
    setAppliedFilters((current) => {
      if (current.datePreset !== 'today') return current;
      const next = createDefaultFilters(currentBusinessDay);
      return current.dateFrom === next.dateFrom && current.dateTo === next.dateTo
        ? current
        : next;
    });
  }, [currentBusinessDay]);

  const queryFilters = useMemo(() => buildQueryFilters(tab, appliedFilters), [tab, appliedFilters]);

  const { data: ordersData, isLoading, isFetching, error: ordersError } = useOrders(queryFilters);
  const { data: filterMeta } = useOrderFilters();
  const orders = ordersData?.orders ?? [];
  const total = ordersData?.total ?? 0;
  const { data: menuData } = useMenu();
  const categories = menuData?.menu ?? [];
  const { data: tables = [] } = useFloorTables();
  const { data: customers = [] } = useCustomers();
  const { data: promotions = [] } = usePromotions(true);
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();
  const formatMoney = useFormatMoney();
  const currency = useBusinessCurrency();
  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();
  const tableMap = useMemo(
    () => Object.fromEntries(tables.map((t) => [t.id, t.tableIdentifier])),
    [tables],
  );
  const { queuePrintBillPrompt, PrintBillPrompt } = usePrintBillPrompt({
    businessName: business?.name,
    businessLocation: business?.location,
    ...receiptPrintPhoneOptions(business),
    businessLogoUrl: business?.logoUrl,
    currency,
    getTableLabel: (order) =>
      order.tableIdentifier ?? (order.tableId ? tableMap[order.tableId] ?? '—' : '—'),
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [tableId, setTableId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [discountType, setDiscountType] = useState<'' | 'PERCENTAGE' | 'FIXED'>('');
  const [discountValue, setDiscountValue] = useState('');
  const configuredTaxPercent = businessTaxRatePercentLabel(business);
  const [taxRatePercent, setTaxRatePercent] = useState('');
  const [taxRateCustomized, setTaxRateCustomized] = useState(false);
  const [serviceRatePercent, setServiceRatePercent] = useState(String(DEFAULT_SERVICE_RATE_PERCENT));
  const displayedTaxPercent = taxRateCustomized ? taxRatePercent : configuredTaxPercent;
  const [orderNotes, setOrderNotes] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [paymentModal, setPaymentModal] = useState<{
    orderId: string;
    total: number;
    label: string;
  } | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: detailOrderFull } = useOrder(detailOpen && detailOrder ? detailOrder.id : '');
  const displayDetailOrder = detailOrderFull ?? detailOrder;

  const recentActivity = orders.slice(0, 3);
  const showOrdersSkeleton = isLoading && !ordersData && !ordersError;

  const menuItems = categories
    .flatMap((c) => c.items ?? [])
    .filter((i) => isMenuItemCustomerSellable(i));
  const cartSubtotal = menuItems.reduce(
    (sum, item) => sum + Number(item.price) * (cart[item.id] ?? 0),
    0,
  );
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const applicablePromotions = useMemo(
    () => promotions.filter((p) => isPromotionApplicable(p)),
    [promotions],
  );

  const selectedPromotion = useMemo(
    () => applicablePromotions.find((p) => p.id === promotionId) ?? null,
    [applicablePromotions, promotionId],
  );

  const manualDiscount = useMemo((): ManualDiscount | null => {
    if (selectedPromotion || !discountType || !discountValue.trim()) return null;
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (discountType === 'PERCENTAGE' && value > 100) return null;
    return { type: discountType, value };
  }, [selectedPromotion, discountType, discountValue]);

  const discountLabel = useMemo(() => {
    if (selectedPromotion) return selectedPromotion.title;
    if (manualDiscount) return formatManualDiscountLabel(manualDiscount, currency);
    return null;
  }, [selectedPromotion, manualDiscount, currency]);

  const pricingPreview = useMemo(() => {
    const taxRate = resolveTaxRatePercent(taxRateCustomized ? taxRatePercent : '', business);
    const serviceRate = Math.min(
      1,
      Math.max(0, Number(serviceRatePercent) / 100 || DEFAULT_SERVICE_RATE_PERCENT / 100),
    );
    return estimateOrderTotal(cartSubtotal, selectedPromotion, {
      taxRate,
      serviceRate,
      manualDiscount,
    });
  }, [
    cartSubtotal,
    selectedPromotion,
    manualDiscount,
    taxRatePercent,
    taxRateCustomized,
    serviceRatePercent,
    business,
  ]);

  function tableLabel(order: Order) {
    if (order.tableIdentifier) return order.tableIdentifier;
    return order.tableId ? tableMap[order.tableId] ?? '—' : '—';
  }

  function serviceLabel(order: Order) {
    const resolved = tableLabel(order);
    return orderServiceSummary(order, resolved !== '—' ? resolved : undefined);
  }

  function applyFilters() {
    if (!draftFilters.dateFrom || !draftFilters.dateTo) {
      toast.error('Select both start and end dates.');
      return;
    }
    if (draftFilters.dateFrom > draftFilters.dateTo) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    setAppliedFilters({ ...draftFilters });
  }

  function resetFilters() {
    const next = createDefaultFilters(currentBusinessDay);
    setDraftFilters(next);
    setAppliedFilters(next);
  }

  function selectDatePreset(preset: 'today' | 'yesterday') {
    const range = getReportPresetRange(preset, currentBusinessDay);
    const next = withDateRange(draftFilters, range.from, range.to, currentBusinessDay);
    setDraftFilters(next);
    setAppliedFilters(next);
  }

  function updateDateRange(from: string, to: string) {
    setDraftFilters((current) => withDateRange(current, from, to, currentBusinessDay));
  }

  function openDetail(order: Order) {
    setDetailOrder(order);
    setDetailOpen(true);
  }

  function handlePrint(order: Order) {
    setBusy({ orderId: order.id, type: 'print' });
    try {
      printOrderReceipt(order, {
        tableLabel: tableLabel(order),
        businessName: business?.name,
        businessLocation: business?.location,
        ...receiptPrintPhoneOptions(business),
        businessLogoUrl: business?.logoUrl,
        copyType: 'customer',
        currency,
        receiptTemplate,
      });
      toast.success(`Printing receipt for order ${formatOrderLabel(order)}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setTimeout(() => setBusy(null), 400);
    }
  }

  function handlePreview(order: Order) {
    try {
      previewOrderReceipt(order, {
        tableLabel: tableLabel(order),
        businessName: business?.name,
        businessLocation: business?.location,
        ...receiptPrintPhoneOptions(business),
        businessLogoUrl: business?.logoUrl,
        copyType: 'customer',
        currency,
        receiptTemplate,
      });
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (!items.length) {
      setError('Add at least one menu item.');
      toast.error('Add at least one menu item.');
      return;
    }
    try {
      const taxRate = resolveTaxRatePercent(taxRateCustomized ? taxRatePercent : '', business);
      const serviceRate = Math.min(1, Math.max(0, Number(serviceRatePercent) / 100));

      const result = await createOrder.mutateAsync({
        source: 'STAFF_ASSISTED',
        tableId: tableId || undefined,
        customerId: customerId || undefined,
        promotionId: promotionId || undefined,
        ...(manualDiscount
          ? { discountType: manualDiscount.type, discountValue: manualDiscount.value }
          : {}),
        taxRate: Number.isFinite(taxRate) ? taxRate : undefined,
        serviceRate: Number.isFinite(serviceRate) ? serviceRate : undefined,
        notes: orderNotes.trim() || undefined,
        items,
      });
      toast.success('Order placed successfully');
      setCart({});
      setTableId('');
      setCustomerId('');
      setPromotionId('');
      setDiscountType('');
      setDiscountValue('');
      setTaxRatePercent('');
      setTaxRateCustomized(false);
      setServiceRatePercent(String(DEFAULT_SERVICE_RATE_PERCENT));
      setOrderNotes('');
      setDrawerOpen(false);
      queuePrintBillPrompt(result.order, 'order-placed');
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    }
  }

  function advanceStatus(id: string, status: string) {
    const next = orderNextStatus(status);
    if (!next) return;
    if (next === 'COMPLETED') {
      const order = orders.find((o) => o.id === id);
      setPaymentModal({
        orderId: id,
        total: Number(order?.totalAmount ?? 0),
        label: `Order ${formatOrderLabel(order ?? id)}`,
      });
      return;
    }
    updateStatus.mutate(
      { id, status: next },
      {
        onSuccess: () => {
          const label =
            next === 'PREPARING' ? 'Preparing' : next === 'READY' ? 'Ready' : 'Completed';
          toast.success(`Order marked as ${label}`);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function confirmCompleteWithPayment(payload: CompleteOrderPaymentPayload) {
    if (!paymentModal) return;
    updateStatus.mutate(
      {
        id: paymentModal.orderId,
        status: 'COMPLETED',
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        payments: payload.payments,
      },
      {
        onSuccess: (data) => {
          toast.success('Order completed');
          setPaymentModal(null);
          queuePrintBillPrompt(data.order, 'order-completed');
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function confirmCancelOrder() {
    if (!cancelOrderId) return;
    updateStatus.mutate(
      { id: cancelOrderId, status: 'CANCELLED' },
      {
        onSuccess: () => {
          toast.success('Order cancelled');
          setCancelOrderId(null);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  const cancelOrderTarget = cancelOrderId
    ? orders.find((order) => order.id === cancelOrderId)
    : null;

  const activeFilterCount = [
    appliedFilters.search.trim(),
    appliedFilters.source,
    appliedFilters.tableIdentifier.trim(),
    appliedFilters.datePreset !== 'today',
  ].filter(Boolean).length;

  return (
    <BusinessLayout slug={slug} hideFab showHeaderTitle={false}>
      <div className="lg:hidden mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[#3d8a7e] text-on-primary flex items-center justify-center shadow-md shadow-primary/20">
            <Icon name="receipt_long" className="text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-primary leading-tight">Live orders</h1>
            <p className="text-xs text-on-surface-variant truncate">
              {TAB_LABELS[tab ?? 'active']} · {dateFilterLabel(appliedFilters)}
            </p>
          </div>
        </div>
        <div className="mt-2.5">
          <StatusTabs tab={tab} onChange={setTab} compact />
        </div>
      </div>

      <div className="hidden lg:block">
        <PageHeader
          icon="receipt_long"
          title="Live orders"
          description="Manage and track customer transactions in real-time."
          actions={<StatusTabs tab={tab} onChange={setTab} />}
        />
      </div>

      <div className="space-y-3 lg:space-y-6">
        <div className="rounded-xl lg:rounded-2xl border border-outline-variant/10 lg:border-2 bg-white p-3 lg:p-5 shadow-sm">
          <div className="flex gap-2">
            <div className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface px-3 h-9 lg:h-11">
              <Icon name="search" className="text-lg text-on-surface-variant shrink-0" />
              <input
                type="text"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((f) => ({ ...f, search: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters();
                }}
                placeholder="Search orders…"
                className="w-full bg-transparent border-0 outline-none text-sm lg:text-base text-on-surface placeholder:text-on-surface-variant/70"
                aria-label="Search orders"
              />
            </div>
            <button
              type="button"
              onClick={applyFilters}
              disabled={isFetching}
              className="lg:hidden h-9 px-3 shrink-0 bg-primary text-on-primary font-body-emphasis rounded-lg active:scale-[0.98] cursor-pointer disabled:opacity-60"
              aria-label="Apply search"
            >
              <Icon name="search" />
            </button>
          </div>

          <div className="flex gap-2 mt-2 lg:hidden">
            {(
              [
                ['today', 'Today'],
                ['yesterday', 'Yesterday'],
              ] as const
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => selectDatePreset(preset)}
                className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  draftFilters.datePreset === preset
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              className="h-9 px-3 shrink-0 border border-outline-variant/30 rounded-lg text-sm font-semibold text-primary flex items-center gap-1 cursor-pointer"
            >
              <Icon name="tune" className="text-base" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-secondary text-on-secondary text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div
            className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block mt-2 lg:mt-4 border-t border-outline-variant/10 lg:border-0 pt-2 lg:pt-0`}
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-end">
                <FilterField label="Date" className="min-w-0 xl:flex-1" compact>
                  <div className="flex h-9 lg:h-11 gap-2">
                    {(
                      [
                        ['today', 'Today'],
                        ['yesterday', 'Yesterday'],
                      ] as const
                    ).map(([preset, label]) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => selectDatePreset(preset)}
                        className={`flex-1 h-full rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          draftFilters.datePreset === preset
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </FilterField>

                <FilterField label="Date range" className="min-w-0 xl:flex-[1.4]" compact>
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <input
                      id="orders-date-from-filter"
                      type="date"
                      value={draftFilters.dateFrom}
                      onChange={(e) => updateDateRange(e.target.value, draftFilters.dateTo)}
                      className={filterControlClass}
                    />
                    <span className="text-on-surface-variant font-caption shrink-0 text-xs">to</span>
                    <input
                      id="orders-date-to-filter"
                      type="date"
                      value={draftFilters.dateTo}
                      onChange={(e) => updateDateRange(draftFilters.dateFrom, e.target.value)}
                      className={filterControlClass}
                    />
                  </div>
                </FilterField>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px] items-end">
                <FilterField label="Source" className="min-w-0" compact>
                  <select
                    value={draftFilters.source}
                    onChange={(e) => setDraftFilters((f) => ({ ...f, source: e.target.value }))}
                    className={filterControlClass}
                  >
                    <option value="">All Sources</option>
                    {(filterMeta?.sources ?? [
                      { value: 'QR_CUSTOMER', label: 'QR Code' },
                      { value: 'STAFF_ASSISTED', label: 'Staff Handheld' },
                    ]).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Table #" className="min-w-0" compact>
                  <input
                    value={draftFilters.tableIdentifier}
                    onChange={(e) =>
                      setDraftFilters((f) => ({ ...f, tableIdentifier: e.target.value }))
                    }
                    placeholder="T4"
                    list="order-table-suggestions"
                    className={filterControlClass}
                  />
                  <datalist id="order-table-suggestions">
                    {(filterMeta?.tables ?? tables).map((t) => (
                      <option key={t.id} value={t.tableIdentifier} />
                    ))}
                  </datalist>
                </FilterField>

                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex-1 md:w-[110px] h-9 lg:h-11 border border-outline-variant text-primary text-sm lg:text-base font-body-emphasis rounded-lg hover:bg-surface-container-low cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      applyFilters();
                      setMobileFiltersOpen(false);
                    }}
                    disabled={isFetching}
                    className="flex-1 md:w-[110px] h-9 lg:h-11 bg-primary text-on-primary text-sm lg:text-base font-body-emphasis rounded-lg active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    {isFetching ? 'Applying…' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="font-caption text-on-surface-variant mt-3 text-xs lg:text-sm leading-relaxed">
            <span className="hidden lg:inline">
              Showing{' '}
              <span className="font-body-emphasis text-on-surface">{TAB_LABELS[tab ?? 'active']}</span>
              {' '}
              · <span className="font-body-emphasis text-on-surface">{dateFilterLabel(appliedFilters)}</span>
              {hasExtraFilters(appliedFilters) && (
                <>
                  {' '}
                  · Filters:
                  {appliedFilters.search.trim()
                    ? ` · "${appliedFilters.search.trim()}"`
                    : ''}
                  {appliedFilters.source
                    ? ` · ${filterMeta?.sources.find((s) => s.value === appliedFilters.source)?.label ?? appliedFilters.source}`
                    : ''}
                  {appliedFilters.tableIdentifier.trim()
                    ? ` · Table ${appliedFilters.tableIdentifier.trim()}`
                    : ''}
                </>
              )}
            </span>
            <span className="lg:hidden font-body-emphasis text-on-surface">
              {orders.length} of {total} orders
            </span>
          </p>
        </div>

        <div className="lg:hidden rounded-xl lg:rounded-2xl border border-outline-variant/10 lg:border-2 bg-white overflow-hidden shadow-sm">
          {showOrdersSkeleton && (
            <div className="p-2 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 space-y-1.5"
                >
                  <div className="h-4 w-32 rounded bg-surface-container-low animate-pulse" />
                  <div className="h-3 w-full rounded bg-surface-container-low animate-pulse" />
                  <div className="h-7 w-40 rounded bg-surface-container-low animate-pulse" />
                </div>
              ))}
            </div>
          )}
          {ordersError && !showOrdersSkeleton && !orders.length && (
            <p className="px-4 py-8 text-center font-caption text-error">{formatApiError(ordersError)}</p>
          )}
          {!showOrdersSkeleton && orders.length > 0 && (
            <div className="p-2 space-y-2">
              {orders.map((order) => {
                const action = orderActionLabel(order.status);
                const isStatusBusy =
                  updateStatus.isPending && updateStatus.variables?.id === order.id;
                const borderColor =
                  order.status === 'PREPARING'
                    ? 'var(--secondary)'
                    : order.status === 'READY'
                      ? 'var(--tertiary-fixed)'
                      : order.status === 'COMPLETED'
                        ? 'var(--primary)'
                        : order.status === 'CANCELLED'
                          ? 'var(--error)'
                          : 'var(--outline-variant)';

                return (
                  <div
                    key={order.id}
                    className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 border-l-[3px] shadow-sm active:bg-surface-container-low/60"
                    style={{ borderLeftColor: borderColor }}
                  >
                    <button
                      type="button"
                      onClick={() => openDetail(order)}
                      className="w-full text-left min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-primary truncate">
                          {formatOrderLabel(order)}
                        </span>
                        <span className="font-mono text-sm font-bold text-primary shrink-0 tabular-nums">
                          {formatMoney(order.totalAmount)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 min-w-0">
                        <OrderStatusBadge status={order.status} />
                        <OrderTypeBadge orderType={order.orderType} compact />
                        <OrderSourceBadge source={order.source} />
                        <span className="text-[11px] text-on-surface-variant truncate">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>
                      <OrderItemsSummary
                        order={order}
                        className="mt-1 min-w-0"
                        mainClassName="text-[11px] text-on-surface-variant line-clamp-1"
                        addedClassName="text-[11px] text-primary font-medium line-clamp-1"
                      />
                    </button>
                    <div className="mt-1.5 -mr-1">
                      <OrderRowActions
                        slug={slug}
                        order={order}
                        statusAction={action}
                        isStatusBusy={isStatusBusy}
                        isPrintBusy={busy?.orderId === order.id && busy.type === 'print'}
                        onView={() => openDetail(order)}
                        onPrint={() => handlePrint(order)}
                        onAdvanceStatus={() => advanceStatus(order.id, order.status)}
                        onCancel={() => setCancelOrderId(order.id)}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!showOrdersSkeleton && !ordersError && orders.length === 0 && (
            <p className="px-4 py-12 text-center font-caption text-on-surface-variant">
              No orders in this view.
            </p>
          )}
        </div>

        <div className="hidden lg:block">
          <DataTable
            minWidth="960px"
            footer={
              !showOrdersSkeleton
                ? `Showing ${orders.length} of ${total} orders`
                : undefined
            }
          >
            <DataTableHead>
              <DataTableRow>
                <DataTableHeadCell>Order #</DataTableHeadCell>
                <DataTableHeadCell>Service</DataTableHeadCell>
                <DataTableHeadCell>Items</DataTableHeadCell>
                <DataTableHeadCell>Total</DataTableHeadCell>
                <DataTableHeadCell>Time</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                <DataTableHeadCell>Source</DataTableHeadCell>
                <DataTableHeadCell>Taken by</DataTableHeadCell>
                <DataTableHeadCell align="right">Actions</DataTableHeadCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {showOrdersSkeleton && <DataTableLoading rows={5} cols={9} />}
              {ordersError && !showOrdersSkeleton && !orders.length && (
                <DataTableError colSpan={9} message={formatApiError(ordersError)} />
              )}
              {!showOrdersSkeleton &&
                orders.map((order) => {
                  const action = orderActionLabel(order.status);
                  const isStatusBusy =
                    updateStatus.isPending && updateStatus.variables?.id === order.id;
                  const isPrintBusy = busy?.orderId === order.id && busy.type === 'print';
                  return (
                    <DataTableRow
                      key={order.id}
                      muted={order.status === 'COMPLETED'}
                      accent={orderRowAccent(order.status)}
                    >
                      <DataTableCell>
                        <DataTablePrimaryCell>{formatOrderLabel(order)}</DataTablePrimaryCell>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-sm">
                        <p className="font-body-emphasis text-on-surface">
                          {formatOrderTypeLabel(order.orderType)}
                        </p>
                        {(order.orderType === 'DINE_IN' || !order.orderType) &&
                          tableLabel(order) !== '—' && (
                            <p className="font-caption text-on-surface-variant text-xs mt-0.5">
                              Table {tableLabel(order)}
                            </p>
                          )}
                      </DataTableCell>
                      <DataTableCell className="text-on-surface-variant max-w-[220px] text-sm">
                        <OrderItemsSummary
                          order={order}
                          mainClassName="truncate"
                          addedClassName="text-primary font-medium truncate text-xs mt-0.5"
                        />
                      </DataTableCell>
                      <DataTableCell>
                        <DataTableMoneyCell>{formatMoney(order.totalAmount)}</DataTableMoneyCell>
                      </DataTableCell>
                      <DataTableCell className="text-on-surface-variant text-sm">{timeAgo(order.createdAt)}</DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <OrderStatusBadge status={order.status} />
                          {order.status === 'COMPLETED' && order.paymentMethod && (
                            <PaymentMethodBadge method={order.paymentMethod} />
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <OrderSourceBadge source={order.source} />
                      </DataTableCell>
                      <DataTableCell className="text-on-surface-variant text-sm">
                        {orderTakerName(order) ?? '—'}
                      </DataTableCell>
                      <DataTableCell align="right">
                        <OrderRowActions
                          slug={slug}
                          order={order}
                          statusAction={action}
                          isStatusBusy={isStatusBusy}
                          isPrintBusy={isPrintBusy}
                          onView={() => openDetail(order)}
                          onPrint={() => handlePrint(order)}
                          onAdvanceStatus={() => advanceStatus(order.id, order.status)}
                          onCancel={() => setCancelOrderId(order.id)}
                          compact
                        />
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              {!showOrdersSkeleton && !ordersError && orders.length === 0 && (
                <DataTableEmpty colSpan={9}>
                  No orders match{' '}
                  <span className="font-body-emphasis">{TAB_LABELS[tab ?? 'active'].toLowerCase()}</span>
                  {hasNonDefaultFilters(appliedFilters, currentBusinessDay) ? ' with these filters' : ''}.{' '}
                  {hasNonDefaultFilters(appliedFilters, currentBusinessDay) || tab !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetFilters();
                        setTab('all');
                      }}
                      className="text-secondary hover:underline cursor-pointer"
                    >
                      Clear filters & show all
                    </button>
                  ) : (
                    <Link
                      href={`/${slug}/orders/new`}
                      className="text-secondary hover:underline cursor-pointer"
                    >
                      Create one
                    </Link>
                  )}
                </DataTableEmpty>
              )}
            </DataTableBody>
          </DataTable>
        </div>

        <section className="hidden lg:block space-y-4 pb-8">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <h3 className="font-title-lg text-primary">Service Activity</h3>
            <button
              type="button"
              onClick={() => toast.success('Full activity log coming soon')}
              className="font-caption text-secondary flex items-center gap-1 hover:underline cursor-pointer"
            >
              VIEW FULL LOG <Icon name="arrow_forward" className="text-[14px]" />
            </button>
          </div>
          <div className="flex flex-col gap-4 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-outline-variant/30" />
            {showOrdersSkeleton ? (
              <ActivitySkeleton count={3} />
            ) : (
              recentActivity.map((order, i) => (
              <div key={order.id} className="flex gap-4 relative">
                <div
                  className={`z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    i === 0
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : i === 1
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : 'bg-surface-container-highest text-outline'
                  }`}
                >
                  <Icon
                    name={i === 0 ? 'check_circle' : i === 1 ? 'shopping_cart' : 'print'}
                    filled={i < 2}
                    className="text-[18px]"
                  />
                </div>
                <div className="flex-1 pb-4 border-b border-outline-variant/10">
                  <p className="font-body-base">
                    Order <span className="font-mono text-primary">{formatOrderLabel(order)}</span>{' '}
                    — {order.status.toLowerCase()}
                  </p>
                  <p className="font-caption text-outline">{timeAgo(order.createdAt)}</p>
                </div>
              </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Link
        href={`/${slug}/orders/new`}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-secondary text-on-secondary rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40 cursor-pointer"
      >
        <Icon name="add" className="text-[28px]" />
      </Link>

      <OrderDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailOrder(null);
        }}
        order={displayDetailOrder}
        tableLabel={displayDetailOrder ? serviceLabel(displayDetailOrder) : '—'}
        onPrint={() => displayDetailOrder && handlePrint(displayDetailOrder)}
        onPreview={() => displayDetailOrder && handlePreview(displayDetailOrder)}
        printing={
          displayDetailOrder
            ? busy?.orderId === displayDetailOrder.id && busy.type === 'print'
            : false
        }
        addItemsHref={
          displayDetailOrder && canAddItemsToOpenTab(displayDetailOrder)
            ? posAddItemsHref(slug, displayDetailOrder)
            : undefined
        }
      />

      <CompleteOrderPaymentModal
        open={paymentModal !== null}
        onClose={() => setPaymentModal(null)}
        orderLabel={paymentModal?.label ?? 'Order'}
        totalAmount={paymentModal?.total ?? 0}
        loading={Boolean(
          paymentModal &&
            updateStatus.isPending &&
            updateStatus.variables?.id === paymentModal.orderId,
        )}
        onConfirm={confirmCompleteWithPayment}
      />
      {PrintBillPrompt}

      <ConfirmDialog
        open={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirm={() => void confirmCancelOrder()}
        title="Cancel order?"
        message={
          cancelOrderTarget
            ? `Are you sure you want to cancel ${formatOrderLabel(cancelOrderTarget)}? This cannot be undone.`
            : 'Are you sure you want to cancel this order? This cannot be undone.'
        }
        confirmLabel="Cancel order"
        destructive
        loading={updateStatus.isPending && updateStatus.variables?.id === cancelOrderId}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setTableId('');
          setCustomerId('');
          setPromotionId('');
          setDiscountType('');
          setDiscountValue('');
          setTaxRatePercent(configuredTaxPercent);
          setServiceRatePercent(String(DEFAULT_SERVICE_RATE_PERCENT));
          setOrderNotes('');
          setCart({});
          setError('');
        }}
        title="New Order"
        width="xl"
        footer={
          <>
            <div className="flex-1 text-left space-y-1 min-w-0">
              {cartCount > 0 && (
                <>
                  <p className="font-caption text-on-surface-variant flex justify-between gap-4">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatMoney(pricingPreview.subtotal)}</span>
                  </p>
                  <p
                    className={`font-caption flex justify-between gap-4 ${
                      pricingPreview.discountAmount > 0 ? 'text-secondary' : 'text-on-surface-variant'
                    }`}
                  >
                    <span>
                      Discount
                      {discountLabel ? ` (${discountLabel})` : ''}
                    </span>
                    <span className="font-mono">
                      {pricingPreview.discountAmount > 0
                        ? `−${formatMoney(pricingPreview.discountAmount)}`
                        : '—'}
                    </span>
                  </p>
                  <p className="font-caption text-on-surface-variant flex justify-between gap-4">
                    <span>Tax ({resolveTaxRatePercentLabel(taxRateCustomized ? taxRatePercent : '', business)}%)</span>
                    <span className="font-mono">{formatMoney(pricingPreview.taxAmount)}</span>
                  </p>
                  {(Number(serviceRatePercent) > 0 || pricingPreview.serviceAmount > 0) && (
                    <p className="font-caption text-on-surface-variant flex justify-between gap-4">
                      <span>Service charge ({serviceRatePercent || 0}%)</span>
                      <span className="font-mono">{formatMoney(pricingPreview.serviceAmount)}</span>
                    </p>
                  )}
                </>
              )}
              <p className="font-caption text-on-surface-variant uppercase pt-1">Total</p>
              <p className="font-display-md text-primary">
                {formatMoney(pricingPreview.totalAmount)}
              </p>
            </div>
            <Button variant="ghost" type="button" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="order-form"
              variant="primary"
              disabled={!cartCount}
              loading={createOrder.isPending}
            >
              Place order
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleCreateOrder} className="space-y-4">
          <SelectField
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'Walk-in customer' },
              ...customers.map((c) => ({
                value: c.id,
                label: [c.name, c.phoneNumber || c.email].filter(Boolean).join(' · '),
              })),
            ]}
          />
          {customers.length === 0 && (
            <p className="font-caption text-on-surface-variant -mt-2">
              No saved customers yet — add them from the Customers page.
            </p>
          )}
          {tables.length > 0 && (
            <SelectField
              label="Table"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              options={[
                { value: '', label: 'No table' },
                ...tables.map((t) => ({ value: t.id, label: t.tableIdentifier })),
              ]}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Discount type"
              value={discountType}
              onChange={(e) => {
                const next = e.target.value as '' | 'PERCENTAGE' | 'FIXED';
                setDiscountType(next);
                if (next) {
                  setPromotionId('');
                } else {
                  setDiscountValue('');
                }
              }}
              options={[
                { value: '', label: 'No discount' },
                { value: 'PERCENTAGE', label: 'Percentage %' },
                { value: 'FIXED', label: 'Fixed amount' },
              ]}
            />
            <Input
              label={discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount'}
              type="number"
              min={0}
              max={discountType === 'PERCENTAGE' ? 100 : undefined}
              step={discountType === 'PERCENTAGE' ? 1 : 0.01}
              value={discountValue}
              disabled={!discountType}
              onChange={(e) => {
                setDiscountValue(e.target.value);
                if (e.target.value.trim()) setPromotionId('');
              }}
              placeholder={discountType ? (discountType === 'PERCENTAGE' ? '10' : '5.00') : '—'}
            />
          </div>
          <SelectField
            label="Promotion"
            value={promotionId}
            onChange={(e) => {
              setPromotionId(e.target.value);
              if (e.target.value) {
                setDiscountType('');
                setDiscountValue('');
              }
            }}
            options={[
              { value: '', label: 'No promotion' },
              ...applicablePromotions.map((p) => ({
                value: p.id,
                label: formatPromotionLabel(p, currency),
              })),
            ]}
          />
          {applicablePromotions.length === 0 && (
            <p className="font-caption text-on-surface-variant -mt-2">
              No active promotions — use the discount fields above or create one on the Promotions page.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tax rate (%)"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={displayedTaxPercent}
              onChange={(e) => {
                setTaxRateCustomized(true);
                setTaxRatePercent(e.target.value);
              }}
              hint="Defaults to your business tax rate; editable per order"
            />
            <Input
              label="Service charge (%)"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={serviceRatePercent}
              onChange={(e) => setServiceRatePercent(e.target.value)}
              hint="Optional fee on discounted subtotal"
            />
          </div>
          <Textarea
            label="Order notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Special instructions, allergies, etc."
            rows={2}
          />
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-outline-variant/20"
            >
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed/20 flex items-center justify-center">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="local_cafe" className="text-2xl text-primary/25" filled />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-emphasis truncate">{item.name}</p>
                <p className="font-caption text-secondary">{formatMoney(item.price)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setCart((c) => {
                      const n = { ...c };
                      if (!n[item.id] || n[item.id] <= 1) delete n[item.id];
                      else n[item.id] -= 1;
                      return n;
                    })
                  }
                  className="w-9 h-9 rounded-lg border cursor-pointer"
                >
                  −
                </button>
                <span className="font-mono w-6 text-center">{cart[item.id] ?? 0}</span>
                <button
                  type="button"
                  onClick={() => setCart((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }))}
                  className="w-9 h-9 rounded-lg bg-primary text-on-primary cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          ))}
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Drawer>
    </BusinessLayout>
  );
}
