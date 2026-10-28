'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { Button, Icon, Input, SelectField, Textarea } from '@/components/ui';
import { Drawer } from '@/components/ui/modal';
import { CustomerSearchField } from '@/components/orders/customer-search-field';
import { HeldOrdersDrawer } from '@/components/orders/held-orders-drawer';
import { OrderTypeBadge } from '@/components/orders/order-badges';
import { PosLiveOrdersStripe } from '@/components/orders/pos-live-orders-stripe';
import { ItemCustomizationModal } from '@/components/orders/item-customization-modal';
import { WeightEntryModal } from '@/components/orders/weight-entry-modal';
import { formatApiError } from '@/lib/api/errors';
import type { Customer, MenuItem, Order, OrderItem } from '@/lib/api/types';
import { printOrderReceipt } from '@/lib/print-order-receipt';
import {
  type CartLine,
  type CartLineSelection,
  cartLineKey,
  cartLineTotal,
  formatCartLineSummary,
  getItemDisplayPrice,
  itemNeedsCustomization,
  itemNeedsWeightEntry,
  isCartLineValid,
  isSellableInventoryOk,
  lineUnitPrice,
} from '@/lib/cart-line';
import { formatOrderItemWeightLine, menuItemIsByWeight } from '@/lib/order-item-display';
import {
  useAddOrderItems,
  useAdjustOrderItemQuantity,
  useCreateOrder,
  useSendOrderToKitchen,
  useUpdateOrderStatus,
} from '@/lib/hooks/mutations';
import {
  useCustomers,
  useFloorTables,
  useHeldOrders,
  useMenu,
  useOrder,
  usePromotions,
  useBusiness,
  useReceiptTemplate,
} from '@/lib/hooks/queries';
import { orderToCartRecord } from '@/lib/order-cart';
import { formatOrderLabel } from '@/lib/order-display';
import {
  canAddItemsToOpenTab,
  isOpenTabOrderType,
  posAddItemsHref,
} from '@/lib/open-tab-order';
import { useBrowserFullscreen } from '@/lib/hooks/use-browser-fullscreen';
import { useFormatMoney, useBusinessCurrency } from '@/lib/hooks/use-business-currency';
import { usePrintBillPrompt } from '@/lib/hooks/use-print-bill-prompt';
import {
  businessDeliveryCharge,
  businessTaxRatePercentLabel,
  DEFAULT_SERVICE_RATE_PERCENT,
  estimateOrderTotal,
  formatManualDiscountLabel,
  formatPromotionLabel,
  isPromotionApplicable,
  type ManualDiscount,
  resolveTaxRatePercent,
  resolveTaxRatePercentLabel,
} from '@/lib/order-pricing';
import {
  cartLinesFromRecord,
  cartRecordFromLines,
  clearPosDraft,
  loadPosDraft,
  savePosDraft,
  type PosOrderMode,
} from '@/lib/pos-draft-storage';
import {
  clearOrderAddDraft,
  loadOrderAddDraftCart,
  saveOrderAddDraftCart,
  summarizeOrderAddDraftCounts,
} from '@/lib/pos-order-add-drafts';
import { themeToStyle } from '@/lib/theme/theme-css';
import { useToast } from '@/lib/toast';

type OrderMode = PosOrderMode;

const ALL_CATEGORY_ID = '__all__';
const ORDER_MODE_KEY = 'venta-pos-order-mode';
const TAX_RATE_PRESETS = [0, 1, 5, 10, 13, 15, 16, 17, 18];
const SERVICE_RATE_PRESETS = [0, 5, 10, 15, 20];

/** New Bill screen surface polish — backgrounds/borders only. */
const BILL_SCREEN_BG = 'bg-[#F5F6F6]';
const BILL_SCREEN_SURFACE = 'bg-white';
const BILL_SCREEN_BORDER = 'border-[#E5E7E7]';
const BILL_PRODUCT_CARD_BORDER =
  'border border-[#C8CCD0] shadow-[0_1px_8px_rgba(0,0,0,0.07)]';
const BILL_PANEL_SHADOW = 'shadow-[0_1px_4px_rgba(0,0,0,0.05)]';

/** Line totals in Current Bill cart (existing + new items). */
const CART_LINE_PRICE_CLASS =
  'font-mono text-lg sm:text-xl font-bold text-on-surface shrink-0 tabular-nums leading-tight';

function RatePercentPicker({
  shortLabel,
  value,
  presets,
  onSelect,
  onSelectDefault,
  defaultPercentLabel,
}: {
  shortLabel: string;
  value: string;
  presets: number[];
  onSelect: (percent: string) => void;
  onSelectDefault?: () => void;
  defaultPercentLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function applyCustom() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0 || num > 100) return;
    onSelect(String(num));
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="text-[10px] font-mono font-semibold text-primary tabular-nums px-1.5 py-0.5 rounded-md border border-primary/25 bg-primary-container/30 hover:bg-primary-container/50 cursor-pointer whitespace-nowrap"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {shortLabel} {value}%
      </button>
      {open && (
        <div
          className="absolute bottom-full right-0 z-[60] mb-1 w-44 rounded-lg border border-outline-variant/25 bg-surface shadow-lg py-1"
          role="listbox"
          onClick={(e) => e.stopPropagation()}
        >
          {onSelectDefault && defaultPercentLabel != null && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-container-low text-on-surface-variant"
              onClick={() => {
                onSelectDefault();
                setOpen(false);
              }}
            >
              Shop default ({defaultPercentLabel}%)
            </button>
          )}
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-container-low tabular-nums ${
                String(preset) === value ? 'font-bold text-primary bg-primary-container/25' : ''
              }`}
              onClick={() => {
                onSelect(String(preset));
                setOpen(false);
              }}
            >
              {preset}%
            </button>
          ))}
          <div className="border-t border-outline-variant/15 px-2 py-2 space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Custom %
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyCustom();
                }}
                className="flex-1 min-w-0 h-8 px-2 rounded-md border border-outline-variant/25 text-xs font-mono"
              />
              <button
                type="button"
                onClick={applyCustom}
                className="shrink-0 h-8 px-2 rounded-md bg-primary text-on-primary text-xs font-semibold"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DISCOUNT_PERCENT_PRESETS = [5, 10, 15, 20];

function DiscountQuickPicker({
  discountType,
  discountValue,
  onClear,
  onSelectPercent,
  onOpenDetails,
}: {
  discountType: '' | 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  onClear: () => void;
  onSelectPercent: (percent: string) => void;
  onOpenDetails: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const summary =
    discountType === 'PERCENTAGE' && discountValue.trim()
      ? `${discountValue}%`
      : discountType === 'FIXED' && discountValue.trim()
        ? discountValue
        : 'Off';

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="text-[10px] font-mono font-semibold text-primary tabular-nums px-1.5 py-0.5 rounded-md border border-primary/25 bg-primary-container/30 hover:bg-primary-container/50 cursor-pointer whitespace-nowrap"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        Discount {summary}
      </button>
      {open && (
        <div
          className="absolute bottom-full right-0 z-[60] mb-1 w-40 rounded-lg border border-outline-variant/25 bg-surface shadow-lg py-1"
          role="listbox"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-xs hover:bg-surface-container-low"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            Off
          </button>
          {DISCOUNT_PERCENT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-container-low tabular-nums ${
                discountType === 'PERCENTAGE' && discountValue === String(preset)
                  ? 'font-bold text-primary bg-primary-container/25'
                  : ''
              }`}
              onClick={() => {
                onSelectPercent(String(preset));
                setOpen(false);
              }}
            >
              {preset}%
            </button>
          ))}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-xs hover:bg-surface-container-low text-on-surface-variant border-t border-outline-variant/15"
            onClick={() => {
              setOpen(false);
              onOpenDetails();
            }}
          >
            More options…
          </button>
        </div>
      )}
    </div>
  );
}

const PosCatalogCard = memo(function PosCatalogCard({
  item,
  formatMoney,
  qtyInCart,
  onAdd,
  justAdded,
}: {
  item: MenuItem;
  formatMoney: (amount: number | string | null | undefined) => string;
  qtyInCart: number;
  onAdd: () => void;
  justAdded?: boolean;
}) {
  const price = menuItemIsByWeight(item)
    ? `${formatMoney(getItemDisplayPrice(item))}/kg`
    : (item.variants?.length ?? 0) > 0
      ? `From ${formatMoney(getItemDisplayPrice(item))}`
      : formatMoney(item.price);
  const inCart = qtyInCart > 0;

  return (
    <button
      type="button"
      onClick={onAdd}
      className={`flex flex-col h-full text-left p-1.5 rounded-lg transition-all cursor-pointer active:scale-[0.99] ${
        justAdded
          ? 'bg-secondary/15 border-2 border-secondary/50 ring-2 ring-secondary/35'
          : inCart
            ? 'bg-primary-container/25 border-2 border-primary/55 shadow-sm ring-1 ring-primary/20'
            : `${BILL_SCREEN_SURFACE} ${BILL_PRODUCT_CARD_BORDER} hover:border-secondary/45 hover:bg-white`
      }`}
    >
      <div className="relative w-full h-[4.25rem] rounded-md overflow-hidden mb-1.5 shrink-0">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover bg-surface-container" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center border border-dashed border-outline-variant/30 bg-surface-container-low/80"
            aria-hidden
          >
            <Icon name="restaurant" className="text-2xl text-on-surface-variant/35" />
          </div>
        )}
        {inCart && (
          <span
            className="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center shadow"
            aria-label={`${qtyInCart} in order`}
          >
            {qtyInCart}
          </span>
        )}
      </div>
      <p className="font-body-emphasis text-[13px] leading-snug line-clamp-2 flex-1">{item.name}</p>
      <div className="flex items-center justify-between gap-1.5 mt-1">
        <span className="text-[11px] font-semibold text-primary truncate">{price}</span>
        <span
          className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
            inCart ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-primary'
          }`}
          aria-hidden
        >
          <Icon name="add" className="text-xl" />
        </span>
      </div>
    </button>
  );
});

const ExistingOrderLineRow = memo(function ExistingOrderLineRow({
  item,
  formatMoney,
  onUpdateQty,
  loading,
}: {
  item: OrderItem;
  formatMoney: (amount: number | string | null | undefined) => string;
  onUpdateQty: (delta: number) => void;
  loading?: boolean;
}) {
  const summaryLines = [
    item.weightG != null ? formatOrderItemWeightLine(item) : null,
    item.variantName,
    ...(item.modifiers ?? []).map((mod) => mod.modifierName),
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-lg bg-surface border border-primary/30 shadow-sm p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-body-emphasis text-sm leading-tight min-w-0 flex-1 line-clamp-2">
          {item.menuItemName}
        </p>
        <p className={CART_LINE_PRICE_CLASS}>{formatMoney(item.lineTotal)}</p>
      </div>
      <div className={`flex items-center justify-between gap-2 ${summaryLines.length > 0 ? 'mt-1' : 'mt-1.5'}`}>
        {summaryLines.length > 0 ? (
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-on-surface-variant truncate">
            {summaryLines.join(' · ')}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={() => onUpdateQty(-1)}
            className="w-8 h-8 rounded-md border border-outline-variant/30 bg-surface font-body-emphasis cursor-pointer text-sm disabled:opacity-50"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="font-mono font-bold w-6 text-center text-sm tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => onUpdateQty(1)}
            className="w-8 h-8 rounded-md bg-primary text-on-primary font-body-emphasis cursor-pointer text-sm disabled:opacity-50"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
});

function OrderPricingBreakdown({
  pricing,
  formatMoney,
  taxPercentLabel,
  discountLabel,
  compact = false,
  showTotal = false,
}: {
  pricing: ReturnType<typeof estimateOrderTotal>;
  formatMoney: (amount: number | string | null | undefined) => string;
  taxPercentLabel: string;
  discountLabel?: string | null;
  compact?: boolean;
  showTotal?: boolean;
}) {
  const rowClass = compact
    ? 'text-xs leading-tight text-on-surface-variant'
    : 'text-sm text-on-surface-variant';
  const amountClass = compact
    ? 'font-mono tabular-nums text-sm font-semibold text-on-surface'
    : 'font-mono tabular-nums';

  const hasChargeBreakdown =
    pricing.discountAmount > 0 ||
    pricing.taxAmount > 0 ||
    pricing.serviceAmount > 0 ||
    pricing.deliveryAmount > 0;

  const showDetailRows = !compact || hasChargeBreakdown;

  return (
    <div
      className={
        compact
          ? 'space-y-0.5'
          : 'rounded-lg bg-surface-container-low p-3 space-y-1 text-sm'
      }
    >
      {showDetailRows && (
        <>
          <div className={`flex justify-between gap-2 ${rowClass}`}>
            <span>Subtotal</span>
            <span className={amountClass}>{formatMoney(pricing.subtotal)}</span>
          </div>
          {pricing.discountAmount > 0 && (
            <div className={`flex justify-between gap-2 ${rowClass} !text-secondary`}>
              <span className="truncate">
                Discount{discountLabel ? ` (${discountLabel})` : ''}
              </span>
              <span className={`${amountClass} shrink-0`}>
                −{formatMoney(pricing.discountAmount)}
              </span>
            </div>
          )}
          {pricing.taxAmount > 0 && (
            <div className={`flex justify-between gap-2 ${rowClass}`}>
              <span>Tax ({taxPercentLabel}%)</span>
              <span className={amountClass}>{formatMoney(pricing.taxAmount)}</span>
            </div>
          )}
          {pricing.serviceAmount > 0 && (
            <div className={`flex justify-between gap-2 ${rowClass}`}>
              <span>{compact ? 'Service' : 'Service charge'}</span>
              <span className={amountClass}>{formatMoney(pricing.serviceAmount)}</span>
            </div>
          )}
          {pricing.deliveryAmount > 0 && (
            <div className={`flex justify-between gap-2 ${rowClass}`}>
              <span>{compact ? 'Delivery' : 'Delivery charge'}</span>
              <span className={amountClass}>{formatMoney(pricing.deliveryAmount)}</span>
            </div>
          )}
        </>
      )}
      {showTotal && (
        <div
          className={`flex justify-between items-center gap-2 ${
            showDetailRows ? 'pt-2 mt-1 border-t-2 border-primary/20' : ''
          }`}
        >
          <span className="text-sm font-bold uppercase tracking-wide text-primary">Total</span>
          <span className="font-mono text-2xl font-bold text-primary tabular-nums">
            {formatMoney(pricing.totalAmount)}
          </span>
        </div>
      )}
    </div>
  );
}

const CartLineRow = memo(function CartLineRow({
  item,
  quantity,
  summaryLines,
  lineTotal,
  formatMoney,
  onEdit,
  onUpdateQty,
  onRemove,
  canEdit,
  compact,
}: {
  item: MenuItem;
  quantity: number;
  summaryLines: string[];
  lineTotal: number;
  formatMoney: (amount: number | string | null | undefined) => string;
  onEdit: () => void;
  onUpdateQty: (delta: number) => void;
  onRemove?: () => void;
  canEdit: boolean;
  compact?: boolean;
}) {
  const pad = compact ? 'p-2' : 'p-3';
  const titleClass = compact ? 'text-sm' : 'text-base';
  const cardClass = compact
    ? 'rounded-lg bg-surface border border-primary/30 shadow-sm'
    : 'rounded-xl bg-primary-container/15 border-2 border-primary/25 shadow-sm';
  const qtyBtn = compact ? 'w-8 h-8 rounded-md text-sm' : 'w-10 h-10 rounded-lg text-base';
  const hasMeta = summaryLines.length > 0 || canEdit;

  return (
    <div className={`${cardClass} ${pad}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-body-emphasis ${titleClass} leading-tight min-w-0 flex-1 line-clamp-2`}>
          {item.name}
        </p>
        <p className={CART_LINE_PRICE_CLASS}>{formatMoney(lineTotal)}</p>
      </div>
      <div
        className={`flex items-center justify-between gap-2 ${hasMeta ? 'mt-1' : 'mt-1.5'}`}
      >
        {hasMeta ? (
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-on-surface-variant truncate">
            {summaryLines.length > 0 && <span>{summaryLines.join(' · ')}</span>}
            {canEdit && (
              <>
                {summaryLines.length > 0 && <span aria-hidden> · </span>}
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-secondary hover:underline cursor-pointer font-medium"
                >
                  Change options
                </button>
              </>
            )}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onUpdateQty(-1)}
            className={`${qtyBtn} border border-outline-variant/30 bg-surface font-body-emphasis cursor-pointer`}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span
            className={`font-mono font-bold text-center tabular-nums ${
              compact ? 'w-6 text-sm' : 'w-7 text-base'
            }`}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(1)}
            className={`${qtyBtn} bg-primary text-on-primary font-body-emphasis cursor-pointer`}
            aria-label="Increase quantity"
          >
            +
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className={`${qtyBtn} text-error border border-error/25 hover:bg-error-container/30 cursor-pointer flex items-center justify-center ml-0.5`}
              aria-label="Remove item"
            >
              <Icon name="delete" className={compact ? 'text-base' : 'text-lg'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

function PosBillExitLink({ href }: { href: string }) {
  return (
    <Link href={href} className="kds-header__exit shrink-0 hover:opacity-90 transition-opacity">
      <Icon name="arrow_back" />
      <span className="kds-header__exit-label">Exit</span>
    </Link>
  );
}

function PosBillFullscreenButton() {
  const { active, supported, toggle } = useBrowserFullscreen();
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className="kds-header__exit shrink-0 hover:opacity-90 transition-opacity !bg-secondary !text-on-secondary"
      aria-pressed={active}
      aria-label={active ? 'Exit full screen' : 'Enter full screen'}
      title={active ? 'Exit full screen (Esc)' : 'Full screen (like F11)'}
    >
      <Icon name={active ? 'fullscreen_exit' : 'fullscreen'} />
      <span className="kds-header__exit-label">{active ? 'Exit screen' : 'Full screen'}</span>
    </button>
  );
}

export function PosOrderScreen({
  slug,
  waiterMode,
  fullScreen,
  exitHref,
}: {
  slug: string;
  waiterMode?: boolean;
  fullScreen?: boolean;
  /** Full-screen mode: kitchen-style exit instead of back arrow. */
  exitHref?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const currency = useBusinessCurrency();

  const { data: menuData, isLoading: menuLoading } = useMenu();
  const categories = menuData?.menu ?? [];
  const inventoryAvailability = menuData?.inventoryAvailability;
  const { data: tables = [] } = useFloorTables();
  const queryClient = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { data: promotions = [] } = usePromotions(true);
  const { data: business } = useBusiness();
  const themeStyle = useMemo(() => themeToStyle(business), [business]);
  const configuredTaxPercent = businessTaxRatePercentLabel(business);
  const tableMap = useMemo(
    () => Object.fromEntries(tables.map((t) => [t.id, t.tableIdentifier])),
    [tables],
  );
  const { queuePrintBillPrompt, PrintBillPrompt } = usePrintBillPrompt({
    businessName: business?.name,
    businessLocation: business?.location,
    businessPhone: business?.phone,
    businessLogoUrl: business?.logoUrl,
    currency,
    getTableLabel: (order) =>
      order.tableIdentifier ?? (order.tableId ? tableMap[order.tableId] ?? '—' : '—'),
  });

  const createOrder = useCreateOrder();
  const addOrderItems = useAddOrderItems();
  const adjustOrderItem = useAdjustOrderItemQuantity();
  const sendToKitchen = useSendOrderToKitchen();

  const existingOrderId = searchParams.get('orderId');
  const heldOrderId = searchParams.get('heldOrderId');
  const { data: existingOrder } = useOrder(existingOrderId ?? '');
  const { data: heldOrder } = useOrder(heldOrderId ?? '');
  const { data: heldOrdersData } = useHeldOrders();
  const heldOrderCount = heldOrdersData?.orders.length ?? 0;
  const updateOrderStatus = useUpdateOrderStatus();

  const [orderMode, setOrderMode] = useState<OrderMode>(() => {
    if (typeof window === 'undefined') return 'DINE_IN';
    const saved = localStorage.getItem(ORDER_MODE_KEY) as OrderMode | null;
    return saved && ['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(saved) ? saved : 'DINE_IN';
  });
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [search, setSearch] = useState('');
  const [tableId, setTableId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [discountType, setDiscountType] = useState<'' | 'PERCENTAGE' | 'FIXED'>('');
  const [discountValue, setDiscountValue] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState('');
  const [taxRateCustomized, setTaxRateCustomized] = useState(false);
  const [serviceRatePercent, setServiceRatePercent] = useState(String(DEFAULT_SERVICE_RATE_PERCENT));
  const [orderNotes, setOrderNotes] = useState('');
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customizationItem, setCustomizationItem] = useState<MenuItem | null>(null);
  const [weightItem, setWeightItem] = useState<MenuItem | null>(null);
  const [pendingWeightG, setPendingWeightG] = useState<number | null>(null);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [initialSelection, setInitialSelection] = useState<CartLineSelection | undefined>();
  const [cartOpen, setCartOpen] = useState(false);
  const [heldOrdersOpen, setHeldOrdersOpen] = useState(false);
  const [punchedOrder, setPunchedOrder] = useState<Order | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [flashItemId, setFlashItemId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: receiptTemplate } = useReceiptTemplate();
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [heldOrderLoaded, setHeldOrderLoaded] = useState(false);
  const skipPosDraftPersistRef = useRef(false);
  const dineInTableScrollRef = useRef<HTMLDivElement>(null);

  const scrollDineInTables = useCallback((direction: -1 | 1) => {
    const el = dineInTableScrollRef.current;
    if (!el) return;
    const step = Math.max(140, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }, []);
  const displayedTaxPercent = taxRateCustomized ? taxRatePercent : configuredTaxPercent;

  useEffect(() => {
    if (existingOrderId || heldOrderId) {
      setDraftHydrated(true);
      return;
    }
    const draft = loadPosDraft(slug, waiterMode);
    if (draft) {
      skipPosDraftPersistRef.current = true;
      setCart(cartRecordFromLines(draft.cart));
      setOrderMode(draft.orderMode);
      setTableId(draft.tableId);
      setCustomerId(draft.customerId);
      setCustomerName(draft.customerName);
      setCustomerPhone(draft.customerPhone);
      setDeliveryAddress(draft.deliveryAddress);
      setDeliveryNotes(draft.deliveryNotes);
      setPromotionId(draft.promotionId);
      setDiscountType(draft.discountType);
      setDiscountValue(draft.discountValue);
      if (draft.taxRateCustomized && draft.taxRatePercent.trim()) {
        setTaxRatePercent(draft.taxRatePercent);
        setTaxRateCustomized(true);
      } else {
        setTaxRatePercent('');
        setTaxRateCustomized(false);
      }
      if (draft.serviceRatePercent) setServiceRatePercent(draft.serviceRatePercent);
      setOrderNotes(draft.orderNotes);
    }
    setDraftHydrated(true);
  }, [slug, waiterMode, existingOrderId, heldOrderId]);

  useEffect(() => {
    if (!heldOrderId || !heldOrder?.isDraft || heldOrderLoaded) return;
    setCart(orderToCartRecord(heldOrder));
    const mode = heldOrder.orderType;
    if (mode === 'DINE_IN' || mode === 'TAKEAWAY' || mode === 'DELIVERY') {
      setOrderMode(mode);
    }
    if (heldOrder.tableId) setTableId(heldOrder.tableId);
    if (heldOrder.customerId) setCustomerId(heldOrder.customerId);
    if (heldOrder.customerName) setCustomerName(heldOrder.customerName);
    if (heldOrder.customerPhone) setCustomerPhone(heldOrder.customerPhone);
    if (heldOrder.deliveryAddress) setDeliveryAddress(heldOrder.deliveryAddress);
    if (heldOrder.deliveryNotes) setDeliveryNotes(heldOrder.deliveryNotes);
    if (heldOrder.notes) setOrderNotes(heldOrder.notes);
    setHeldOrderLoaded(true);
    setCartOpen(true);
  }, [heldOrderId, heldOrder, heldOrderLoaded]);

  useEffect(() => {
    if (!draftHydrated || existingOrderId || heldOrderId) return;
    if (skipPosDraftPersistRef.current) {
      skipPosDraftPersistRef.current = false;
      return;
    }
    savePosDraft(
      slug,
      {
        cart: cartLinesFromRecord(cart),
        orderMode,
        tableId,
        customerId,
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryNotes,
        promotionId,
        discountType,
        discountValue,
        taxRatePercent: taxRateCustomized ? taxRatePercent : '',
        taxRateCustomized,
        serviceRatePercent,
        orderNotes,
      },
      waiterMode,
    );
  }, [
    draftHydrated,
    existingOrderId,
    slug,
    waiterMode,
    cart,
    orderMode,
    tableId,
    customerId,
    customerName,
    customerPhone,
    deliveryAddress,
    deliveryNotes,
    promotionId,
    discountType,
    discountValue,
    taxRatePercent,
    taxRateCustomized,
    serviceRatePercent,
    orderNotes,
  ]);

  useEffect(() => {
    const presetTableId = searchParams.get('tableId');
    if (presetTableId) {
      setTableId(presetTableId);
      setOrderMode('DINE_IN');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!existingOrder) return;
    const mode = existingOrder.orderType;
    if (mode === 'DINE_IN' || mode === 'TAKEAWAY' || mode === 'DELIVERY') {
      setOrderMode(mode);
    }
    if (existingOrder.tableId) setTableId(existingOrder.tableId);
    if (existingOrder.customerName) setCustomerName(existingOrder.customerName);
    if (existingOrder.customerPhone) setCustomerPhone(existingOrder.customerPhone);
    if (existingOrder.deliveryAddress) setDeliveryAddress(existingOrder.deliveryAddress);
    if (existingOrder.deliveryNotes) setDeliveryNotes(existingOrder.deliveryNotes);
    if (existingOrder.notes) setOrderNotes(existingOrder.notes);
  }, [existingOrder]);

  const orderLocked = Boolean(
    existingOrderId && existingOrder && !canAddItemsToOpenTab(existingOrder),
  );
  const posBasePath = waiterMode ? 'waiter/orders' : 'orders';
  const newBillHref = `/${slug}/${posBasePath}/new`;

  useEffect(() => {
    if (!existingOrderId) {
      localStorage.setItem(ORDER_MODE_KEY, orderMode);
    }
  }, [orderMode, existingOrderId]);

  function applyCustomerFields(customer: Customer) {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phoneNumber ?? '');
    setDeliveryAddress(customer.deliveryAddress ?? '');
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    applyCustomerFields(customer);
    queryClient.setQueryData<Customer[]>(['customers'], (existing) => {
      const list = existing ?? [];
      return list.some((entry) => entry.id === customer.id)
        ? list.map((entry) => (entry.id === customer.id ? customer : entry))
        : [...list, customer];
    });
  }

  function clearCustomerSelection() {
    setSelectedCustomer(null);
    setCustomerId('');
  }

  function detachCustomerLink() {
    if (customerId || selectedCustomer) {
      clearCustomerSelection();
    }
  }

  useEffect(() => {
    if (!customerId || selectedCustomer?.id === customerId) return;
    const cached = customers.find((c) => c.id === customerId);
    if (cached) {
      setSelectedCustomer(cached);
      applyCustomerFields(cached);
      return;
    }
    void apiFetch<{ customer: Customer }>(`/customers/${customerId}`)
      .then(({ customer }) => {
        setSelectedCustomer(customer);
        applyCustomerFields(customer);
      })
      .catch(() => {});
  }, [customerId, customers, selectedCustomer?.id]);

  useEffect(() => {
    if (!customerId || customers.length === 0) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    setCustomerName((current) => current || customer.name);
    setCustomerPhone((current) => current || (customer.phoneNumber ?? ''));
    setDeliveryAddress((current) => current || (customer.deliveryAddress ?? ''));
  }, [customerId, customers]);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const itemById = useMemo(
    () => Object.fromEntries(availableItemsFromCategories(categories).map(({ item }) => [item.id, item])),
    [categories],
  );

  useEffect(() => {
    if (!draftHydrated || menuLoading) return;
    setCart((current) => {
      let changed = false;
      const next: Record<string, CartLine> = {};
      for (const [key, line] of Object.entries(current)) {
        if (isCartLineValid(itemById[line.menuItemId], line, inventoryAvailability)) {
          next[key] = line;
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [draftHydrated, menuLoading, itemById]);

  const availableItems = useMemo(
    () => availableItemsFromCategories(categories, inventoryAvailability),
    [categories, inventoryAvailability],
  );

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableItems.filter(({ item, categoryId }) => {
      if (activeCategoryId !== ALL_CATEGORY_ID && categoryId !== activeCategoryId) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false) ||
        categoryMap[categoryId]?.toLowerCase().includes(q)
      );
    });
  }, [availableItems, activeCategoryId, search, categoryMap]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, line]) => line.quantity > 0)
        .map(([lineKey, line]) => {
          const item = itemById[line.menuItemId];
          if (!item) return null;
          const lineTotal = cartLineTotal(item, line);
          return {
            lineKey,
            item,
            quantity: line.quantity,
            summaryLines: formatCartLineSummary(item, line),
            lineTotal,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [cart, itemById],
  );

  const cartItemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  const [addDraftCounts, setAddDraftCounts] = useState<Record<string, number>>(() =>
    summarizeOrderAddDraftCounts(slug),
  );
  /** Skip one persist cycle after loading cart from storage (avoids copying previous order's cart). */
  const skipAddDraftPersistRef = useRef(false);
  const prevAddToOrderIdRef = useRef<string | null>(null);

  const syncAddDraftCounts = useCallback(() => {
    setAddDraftCounts(summarizeOrderAddDraftCounts(slug));
  }, [slug]);

  useEffect(() => {
    syncAddDraftCounts();
  }, [syncAddDraftCounts]);

  useLayoutEffect(() => {
    const prevOrderId = prevAddToOrderIdRef.current;
    prevAddToOrderIdRef.current = existingOrderId;

    if (existingOrderId) {
      skipAddDraftPersistRef.current = true;
      setCart(cartRecordFromLines(loadOrderAddDraftCart(slug, existingOrderId)));
      return;
    }

    if (prevOrderId) {
      skipPosDraftPersistRef.current = true;
      const draft = loadPosDraft(slug, waiterMode);
      setCart(draft ? cartRecordFromLines(draft.cart) : {});
    }
  }, [existingOrderId, slug, waiterMode]);

  useEffect(() => {
    if (!existingOrderId) return;
    if (skipAddDraftPersistRef.current) {
      skipAddDraftPersistRef.current = false;
      syncAddDraftCounts();
      return;
    }
    saveOrderAddDraftCart(slug, existingOrderId, cartLinesFromRecord(cart));
    syncAddDraftCounts();
  }, [cart, existingOrderId, slug, syncAddDraftCounts]);

  function handleStripeSelectOrder(order: Order) {
    if (!canAddItemsToOpenTab(order)) {
      toast.error('This order cannot accept more items.');
      return;
    }
    if (existingOrderId === order.id) return;
    if (existingOrderId) {
      saveOrderAddDraftCart(slug, existingOrderId, cartLinesFromRecord(cart));
    }
    syncAddDraftCounts();
    setPunchedOrder(null);
    setCartOpen(false);
    router.replace(posAddItemsHref(slug, order, posBasePath));
  }

  function exitAddToOrderMode() {
    if (existingOrderId) {
      saveOrderAddDraftCart(slug, existingOrderId, cartLinesFromRecord(cart));
      syncAddDraftCounts();
    }
    setCartOpen(false);
    router.replace(newBillHref);
  }

  const newBillExitButton = (className = '', compact = false) => (
    <Button
      type="button"
      variant="secondary"
      onClick={exitAddToOrderMode}
      className={`!font-bold shadow-md border-2 border-secondary/25 whitespace-nowrap ${
        compact ? '!h-9 !text-xs !px-3' : '!h-11 !text-sm !px-4'
      } ${className}`}
    >
      <Icon name="note_add" className={compact ? 'text-base' : 'text-lg'} />
      New bill
    </Button>
  );

  const qtyByMenuItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cartLines) {
      map.set(line.item.id, (map.get(line.item.id) ?? 0) + line.quantity);
    }
    return map;
  }, [cartLines]);

  const cartSubtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);

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

  const pricing = useMemo(() => {
    const taxRate = resolveTaxRatePercent(
      taxRateCustomized ? taxRatePercent : '',
      business,
    );
    const serviceRate = Math.min(1, Math.max(0, Number(serviceRatePercent) / 100 || 0));
    const deliveryAmount =
      orderMode === 'DELIVERY' ? businessDeliveryCharge(business) : 0;
    return estimateOrderTotal(cartSubtotal, selectedPromotion, {
      taxRate,
      serviceRate,
      manualDiscount,
      deliveryAmount,
    });
  }, [
    cartSubtotal,
    selectedPromotion,
    manualDiscount,
    taxRatePercent,
    taxRateCustomized,
    serviceRatePercent,
    business,
    orderMode,
  ]);

  const taxPercentLabel = resolveTaxRatePercentLabel(
    taxRateCustomized ? taxRatePercent : '',
    business,
  );

  const existingOrderTotal = Number(existingOrder?.totalAmount ?? 0);
  const newItemsTotal = pricing.totalAmount;
  const estimatedBillTotal = existingOrderId ? existingOrderTotal + newItemsTotal : newItemsTotal;
  const existingOrderLines = existingOrder?.items ?? [];
  const isHeldDraftOrder = Boolean(
    existingOrderId && existingOrder?.isDraft && !existingOrder.sentToKitchenAt,
  );

  function pulseAddedItem(menuItemId: string) {
    setFlashItemId(menuItemId);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashItemId(null), 450);
  }

  function addToCart(menuItemId: string, selection: CartLineSelection, quantity = 1) {
    const key = cartLineKey(
      menuItemId,
      selection.modifierOptionIds,
      selection.variantId,
      selection.weightG,
    );
    setCart((c) => {
      const existing = c[key];
      return {
        ...c,
        [key]: {
          menuItemId,
          variantId: selection.variantId,
          weightG: selection.weightG,
          modifierOptionIds: selection.modifierOptionIds,
          quantity: (existing?.quantity ?? 0) + quantity,
        },
      };
    });
    pulseAddedItem(menuItemId);
  }

  function replaceCartLine(oldLineKey: string, line: CartLine) {
    setCart((c) => {
      const next = { ...c };
      delete next[oldLineKey];
      const key = cartLineKey(
        line.menuItemId,
        line.modifierOptionIds,
        line.variantId,
        line.weightG,
      );
      next[key] = { ...line };
      return next;
    });
  }

  function handleCatalogClick(item: MenuItem) {
    if (itemNeedsWeightEntry(item)) {
      setEditingLineKey(null);
      setInitialSelection(undefined);
      setPendingWeightG(null);
      setWeightItem(item);
      return;
    }
    if (itemNeedsCustomization(item)) {
      setEditingLineKey(null);
      setInitialSelection(undefined);
      setCustomizationItem(item);
      return;
    }
    addToCart(item.id, { modifierOptionIds: [] });
  }

  function afterWeightChosen(item: MenuItem, weightG: number) {
    if (itemNeedsCustomization(item)) {
      setPendingWeightG(weightG);
      setCustomizationItem(item);
      setInitialSelection({ weightG, modifierOptionIds: [] });
      return;
    }
    addToCart(item.id, { weightG, modifierOptionIds: [] });
  }

  function handleWeightConfirm(weightG: number) {
    if (!weightItem) return;
    if (editingLineKey) {
      const line = cart[editingLineKey];
      if (line) {
        if (itemNeedsCustomization(weightItem)) {
          setPendingWeightG(weightG);
          setInitialSelection({
            weightG,
            variantId: line.variantId,
            modifierOptionIds: line.modifierOptionIds,
          });
          setCustomizationItem(weightItem);
        } else {
          replaceCartLine(editingLineKey, {
            ...line,
            weightG,
            variantId: null,
          });
          setEditingLineKey(null);
        }
      }
      setWeightItem(null);
      return;
    }
    afterWeightChosen(weightItem, weightG);
    setWeightItem(null);
  }

  function handleCustomizationConfirm(selection: CartLineSelection) {
    if (!customizationItem) return;
    const weightG = selection.weightG ?? pendingWeightG ?? undefined;
    if (menuItemIsByWeight(customizationItem) && weightG == null) {
      setWeightItem(customizationItem);
      return;
    }
    const fullSelection: CartLineSelection = {
      ...selection,
      weightG: menuItemIsByWeight(customizationItem) ? weightG : selection.weightG,
      variantId: menuItemIsByWeight(customizationItem) ? null : selection.variantId,
    };
    if (editingLineKey) {
      const line = cart[editingLineKey];
      if (line) {
        replaceCartLine(editingLineKey, {
          menuItemId: customizationItem.id,
          variantId: fullSelection.variantId,
          weightG: fullSelection.weightG,
          modifierOptionIds: fullSelection.modifierOptionIds,
          quantity: line.quantity,
        });
      }
      setEditingLineKey(null);
      setInitialSelection(undefined);
      setCustomizationItem(null);
      setPendingWeightG(null);
      return;
    }
    addToCart(customizationItem.id, fullSelection);
    setCustomizationItem(null);
    setPendingWeightG(null);
  }

  function handleEditLine(lineKey: string, line: CartLine, item: MenuItem) {
    setEditingLineKey(lineKey);
    if (menuItemIsByWeight(item)) {
      setWeightItem(item);
      setInitialSelection(undefined);
      return;
    }
    setInitialSelection({
      variantId: line.variantId,
      modifierOptionIds: line.modifierOptionIds,
    });
    setCustomizationItem(item);
  }

  function handleAdjustExistingItem(orderItemId: string, delta: number) {
    if (!existingOrderId) return;
    adjustOrderItem.mutate(
      { orderId: existingOrderId, orderItemId, delta },
      {
        onSuccess: () => toast.success(delta < 0 ? 'Item updated' : 'Item quantity increased'),
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function updateQty(lineKey: string, delta: number) {
    setCart((c) => {
      const line = c[lineKey];
      if (!line) return c;
      const nextQty = line.quantity + delta;
      if (nextQty <= 0) {
        const next = { ...c };
        delete next[lineKey];
        return next;
      }
      return { ...c, [lineKey]: { ...line, quantity: nextQty } };
    });
  }

  function buildCartItems() {
    return Object.entries(cart)
      .filter(([, line]) => line.quantity > 0)
      .filter(([, line]) => isCartLineValid(itemById[line.menuItemId], line, inventoryAvailability))
      .map(([, line]) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        ...(line.weightG != null ? { weightG: line.weightG } : {}),
        ...(line.modifierOptionIds.length
          ? { modifierOptionIds: line.modifierOptionIds }
          : {}),
      }));
  }

  function validateDeliveryDetails(): boolean {
    if (orderMode !== 'DELIVERY') return true;
    if (!deliveryAddress.trim()) {
      toast.error('Enter a delivery address.');
      setCartOpen(true);
      return false;
    }
    if (!customerName.trim()) {
      toast.error('Enter the customer name for delivery.');
      setCartOpen(true);
      return false;
    }
    if (!customerPhone.trim()) {
      toast.error('Enter the customer phone for delivery.');
      setCartOpen(true);
      return false;
    }
    return true;
  }

  function buildCreateOrderPayload(items: ReturnType<typeof buildCartItems>, asDraft: boolean) {
    const taxRate = resolveTaxRatePercent(taxRateCustomized ? taxRatePercent : '', business);
    const serviceRate = Math.min(1, Math.max(0, Number(serviceRatePercent) / 100));
    const resolvedTableId = orderMode === 'DINE_IN' ? tableId || undefined : undefined;

    return {
      source: 'STAFF_ASSISTED' as const,
      orderType: orderMode,
      tableId: resolvedTableId,
      customerId: customerId || undefined,
      promotionId: promotionId || undefined,
      ...(manualDiscount
        ? { discountType: manualDiscount.type, discountValue: manualDiscount.value }
        : {}),
      taxRate: Number.isFinite(taxRate) ? taxRate : undefined,
      serviceRate: Number.isFinite(serviceRate) ? serviceRate : undefined,
      notes: orderNotes.trim() || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
      deliveryNotes: deliveryNotes.trim() || undefined,
      isDraft: asDraft,
      items,
    };
  }

  async function cancelHeldOrder(orderId: string) {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status: 'CANCELLED' });
    } catch {
      // Ignore if the held order was already removed.
    }
  }

  function resetPosSession() {
    if (heldOrderId) {
      router.replace(`/${slug}/orders/new`);
    }
    setHeldOrderLoaded(false);
    setSelectedCustomer(null);
  }

  function clearOrder() {
    setCart({});
    setCartOpen(false);
    if (!existingOrderId) {
      setTableId('');
      setCustomerId('');
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setDeliveryNotes('');
      setPromotionId('');
      setDiscountType('');
      setDiscountValue('');
      setOrderNotes('');
      setTaxRatePercent('');
      setTaxRateCustomized(false);
      setServiceRatePercent(String(DEFAULT_SERVICE_RATE_PERCENT));
      clearPosDraft(slug, waiterMode);
      resetPosSession();
    }
  }

  async function handleHoldOrder() {
    const items = buildCartItems();
    if (!items.length) {
      toast.error('Add at least one item to hold.');
      return;
    }
    if (!validateDeliveryDetails()) return;

    try {
      if (heldOrderId) {
        await cancelHeldOrder(heldOrderId);
      }
      await createOrder.mutateAsync(buildCreateOrderPayload(items, true));
      toast.success('Order held — start a new order anytime');
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearOrder();
      setCartOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  function handleSubmit(asDraft: boolean) {
    const items = buildCartItems();

    if (!items.length) {
      toast.error('Add at least one item to the order.');
      return;
    }

    const taxRate = resolveTaxRatePercent(taxRateCustomized ? taxRatePercent : '', business);
    const serviceRate = Math.min(1, Math.max(0, Number(serviceRatePercent) / 100));

    if (existingOrderId) {
      addOrderItems.mutate(
        {
          orderId: existingOrderId,
          items,
          taxRate: Number.isFinite(taxRate) ? taxRate : undefined,
          serviceRate: Number.isFinite(serviceRate) ? serviceRate : undefined,
        },
        {
          onSuccess: () => {
            toast.success('Items added to order');
            if (existingOrderId) {
              clearOrderAddDraft(slug, existingOrderId);
              syncAddDraftCounts();
            }
            setCart({});
            setCartOpen(false);
            router.replace(newBillHref);
          },
          onError: (err) => toast.error(formatApiError(err)),
        },
      );
      return;
    }

    if (!validateDeliveryDetails()) return;

    createOrder.mutate(
      buildCreateOrderPayload(items, waiterMode ? asDraft : false),
      {
        onSuccess: async (data) => {
          if (heldOrderId) {
            await cancelHeldOrder(heldOrderId);
          }
          toast.success(
            asDraft ? 'Draft order saved' : waiterMode ? 'Order placed' : 'Order punched',
          );
          if (!customerId && orderMode === 'DELIVERY' && customerName.trim() && customerPhone.trim()) {
            toast.success('New customer saved to your customer list');
          }
          void queryClient.invalidateQueries({ queryKey: ['customers'] });
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
          clearOrder();
          const destination = waiterMode ? `/${slug}/waiter/orders` : `/${slug}/orders`;
          if (asDraft) {
            router.push(destination);
            return;
          }
          const addMoreHref = isOpenTabOrderType(data.order.orderType)
            ? posAddItemsHref(slug, data.order, posBasePath)
            : undefined;
          if (waiterMode) {
            queuePrintBillPrompt(
              data.order,
              'order-placed',
              () => router.push(destination),
              addMoreHref ? () => router.push(addMoreHref) : undefined,
            );
          } else {
            setPunchedOrder(data.order);
          }
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  async function handlePlaceHeldDraftOrder() {
    if (!existingOrderId || !isHeldDraftOrder) return;
    if (existingOrderLines.length === 0 && cartLines.length === 0) {
      toast.error('Add at least one item to place this order.');
      return;
    }

    const taxRate = resolveTaxRatePercent(taxRateCustomized ? taxRatePercent : '', business);
    const serviceRate = Math.min(1, Math.max(0, Number(serviceRatePercent) / 100));
    const items = buildCartItems();

    try {
      if (items.length > 0) {
        await addOrderItems.mutateAsync({
          orderId: existingOrderId,
          items,
          taxRate: Number.isFinite(taxRate) ? taxRate : undefined,
          serviceRate: Number.isFinite(serviceRate) ? serviceRate : undefined,
        });
        clearOrderAddDraft(slug, existingOrderId);
        syncAddDraftCounts();
        setCart({});
      }
      const { order } = await sendToKitchen.mutateAsync(existingOrderId);
      toast.success(waiterMode ? 'Order placed' : 'Order punched');
      setCartOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      setPunchedOrder(order);
      router.replace(newBillHref);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  function printPunchedBill(order: Order) {
    try {
      const tableLabel =
        order.tableIdentifier ?? (order.tableId ? tableMap[order.tableId] ?? '—' : '—');
      printOrderReceipt(order, {
        tableLabel,
        businessName: business?.name,
        businessLocation: business?.location,
        businessPhone: business?.phone,
        businessLogoUrl: business?.logoUrl,
        copyType: 'customer',
        currency,
        receiptTemplate,
      });
      toast.success(`Printing bill for ${formatOrderLabel(order)}`);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  function handleNewBillAfterPunch() {
    setPunchedOrder(null);
    clearOrder();
  }

  function handleAddMoreAfterPunch(order: Order) {
    setPunchedOrder(null);
    const href = isOpenTabOrderType(order.orderType)
      ? posAddItemsHref(slug, order, posBasePath)
      : `/${slug}/${posBasePath}`;
    router.push(href);
  }

  const orderPanelTitle = existingOrderId
    ? formatOrderLabel(existingOrder ?? existingOrderId)
    : heldOrderId && heldOrder
      ? formatOrderLabel(heldOrder)
      : 'New bill';

  const categoryTabs: Array<{ id: string; label: string }> = [
    { id: ALL_CATEGORY_ID, label: 'All' },
    ...categories.filter((c) => c.isActive).map((c) => ({ id: c.id, label: c.name })),
  ];

  const backHref = waiterMode ? `/${slug}/waiter/orders` : `/${slug}/orders`;
  const heightClass =
    fullScreen || exitHref
      ? 'flex-1 min-h-0 h-full max-h-full'
      : 'flex-1 min-h-0 h-full max-h-full';
  const isSubmitting =
    createOrder.isPending ||
    addOrderItems.isPending ||
    adjustOrderItem.isPending ||
    updateOrderStatus.isPending ||
    sendToKitchen.isPending;
  const showHoldActions = !waiterMode && !existingOrderId;

  const orderTypeSelector = (
    <div className="flex gap-1 p-0.5 bg-surface-container rounded-lg">
        {(
          [
            ['DINE_IN', 'Dine In'],
            ['TAKEAWAY', 'Takeaway'],
            ['DELIVERY', 'Delivery'],
          ] as const
        ).map(([mode, label]) => {
          const selected = orderMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setOrderMode(mode)}
              disabled={Boolean(existingOrderId)}
              aria-pressed={selected}
              className={`flex-1 px-2 py-2.5 rounded-md text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 border ${
                selected
                  ? 'bg-primary text-on-primary border-primary shadow-sm ring-2 ring-primary/30 ring-offset-1'
                  : 'text-on-surface-variant border-transparent hover:bg-surface-container-high'
              }`}
            >
              {label}
            </button>
          );
        })}
    </div>
  );

  const dineInTablePicker =
    !existingOrderId && orderMode === 'DINE_IN' && tables.length > 0 ? (
      <div className="space-y-1 min-w-0">
        <div className="flex items-stretch gap-0.5 min-w-0">
          <button
            type="button"
            onClick={() => scrollDineInTables(-1)}
            className="shrink-0 w-8 flex items-center justify-center rounded-lg border border-outline-variant/30 bg-surface text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Scroll tables left"
          >
            <Icon name="chevron_left" className="text-lg" />
          </button>
          <div
            ref={dineInTableScrollRef}
            className="flex gap-1 overflow-x-auto hide-scrollbar flex-1 min-w-0 pb-0.5"
          >
            <button
              type="button"
              onClick={() => setTableId('')}
              aria-pressed={!tableId}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border ${
                !tableId
                  ? 'bg-primary text-on-primary border-primary ring-2 ring-primary/25'
                  : 'border-outline-variant/30 text-on-surface-variant bg-surface'
              }`}
            >
              No table assigned
            </button>
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTableId(t.id)}
                aria-pressed={tableId === t.id}
                aria-label={`Table ${t.tableIdentifier}`}
                className={`shrink-0 px-3 py-2 rounded-lg border ${
                  tableId === t.id
                    ? 'bg-primary text-on-primary border-primary ring-2 ring-primary/25'
                    : 'border-outline-variant/30 text-on-surface bg-surface'
                }`}
              >
                <span className="text-sm font-bold tracking-wide">{t.tableIdentifier}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollDineInTables(1)}
            className="shrink-0 w-8 flex items-center justify-center rounded-lg border border-outline-variant/30 bg-surface text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Scroll tables right"
          >
            <Icon name="chevron_right" className="text-lg" />
          </button>
        </div>
      </div>
    ) : null;

  const orderContextFields = !existingOrderId ? (
    <div className="space-y-1.5">
      {orderMode === 'TAKEAWAY' && (
        <CustomerSearchField
          label="Customer (optional)"
          compact
          selectedCustomer={selectedCustomer}
          onSelect={selectCustomer}
          onClear={clearCustomerSelection}
        />
      )}
      {orderMode === 'DELIVERY' && (
        <div className="space-y-1">
          <CustomerSearchField
            label="Customer"
            compact
            selectedCustomer={selectedCustomer}
            onSelect={selectCustomer}
            onClear={clearCustomerSelection}
            placeholder="Search name or phone…"
          />
          {!selectedCustomer && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  dense
                  label="Name"
                  value={customerName}
                  onChange={(e) => {
                    detachCustomerLink();
                    setCustomerName(e.target.value);
                  }}
                  className="!h-8 !px-2.5 !text-xs"
                />
                <Input
                  dense
                  label="Phone"
                  value={customerPhone}
                  onChange={(e) => {
                    detachCustomerLink();
                    setCustomerPhone(e.target.value);
                  }}
                  className="!h-8 !px-2.5 !text-xs"
                />
              </div>
              <Input
                dense
                label="Address"
                value={deliveryAddress}
                onChange={(e) => {
                  detachCustomerLink();
                  setDeliveryAddress(e.target.value);
                }}
                className="!h-8 !px-2.5 !text-xs"
              />
            </>
          )}
        </div>
      )}
    </div>
  ) : null;

  const cartItemsList = (
    <>
      {existingOrderId && existingOrderLines.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            On this order
          </p>
          {existingOrderLines.map((item) => (
            <ExistingOrderLineRow
              key={item.id}
              item={item}
              formatMoney={formatMoney}
              loading={adjustOrderItem.isPending}
              onUpdateQty={(delta) => handleAdjustExistingItem(item.id, delta)}
            />
          ))}
        </div>
      )}
      {cartLines.length === 0 ? (
        <p className="text-xs text-on-surface-variant py-1">
          {existingOrderId ? 'Add items from the menu.' : 'Tap products to build the bill.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {cartLines.map(({ lineKey, item, quantity, summaryLines, lineTotal }) => (
            <CartLineRow
              key={lineKey}
              item={item}
              quantity={quantity}
              summaryLines={summaryLines}
              lineTotal={lineTotal}
              formatMoney={formatMoney}
              compact
              canEdit={itemNeedsCustomization(item) || itemNeedsWeightEntry(item)}
              onEdit={() => handleEditLine(lineKey, cart[lineKey], item)}
              onUpdateQty={(delta) => updateQty(lineKey, delta)}
              onRemove={() => updateQty(lineKey, -quantity)}
            />
          ))}
        </div>
      )}
    </>
  );

  const orderExtrasAccordion =
    !existingOrderId && !waiterMode ? (
      <div className="rounded-lg border border-outline-variant/20 overflow-visible bg-surface">
        <div
          className="flex items-center gap-1.5 px-2 py-2 hover:bg-surface-container-low/80"
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setExtrasOpen((open) => !open)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer py-0.5"
            aria-expanded={extrasOpen}
          >
            <Icon
              name={extrasOpen ? 'expand_less' : 'expand_more'}
              className="text-lg text-on-surface-variant shrink-0"
            />
            <span className="text-xs font-semibold text-on-surface-variant truncate">
              Charges & discount
            </span>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <RatePercentPicker
              shortLabel="Tax"
              value={displayedTaxPercent}
              presets={TAX_RATE_PRESETS}
              defaultPercentLabel={configuredTaxPercent}
              onSelectDefault={() => {
                setTaxRateCustomized(false);
                setTaxRatePercent('');
              }}
              onSelect={(percent) => {
                setTaxRateCustomized(true);
                setTaxRatePercent(percent);
              }}
            />
            <span className="text-[10px] text-on-surface-variant">·</span>
            <RatePercentPicker
              shortLabel="Service"
              value={serviceRatePercent}
              presets={SERVICE_RATE_PRESETS}
              onSelect={(percent) => setServiceRatePercent(percent)}
            />
            <DiscountQuickPicker
              discountType={discountType}
              discountValue={discountValue}
              onClear={() => {
                setDiscountType('');
                setDiscountValue('');
                setPromotionId('');
              }}
              onSelectPercent={(percent) => {
                setDiscountType('PERCENTAGE');
                setDiscountValue(percent);
                setPromotionId('');
              }}
              onOpenDetails={() => setExtrasOpen(true)}
            />
          </div>
        </div>
        {extrasOpen && (
          <div className="px-3 py-2.5 space-y-2 border-t border-outline-variant/15 max-h-[min(200px,28vh)] overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Discount"
                value={discountType}
                onChange={(e) => {
                  const next = e.target.value as '' | 'PERCENTAGE' | 'FIXED';
                  setDiscountType(next);
                  if (next) setPromotionId('');
                  else setDiscountValue('');
                }}
                options={[
                  { value: '', label: 'None' },
                  { value: 'PERCENTAGE', label: '%' },
                  { value: 'FIXED', label: 'Fixed' },
                ]}
              />
              <Input
                label="Value"
                type="number"
                value={discountValue}
                disabled={!discountType}
                onChange={(e) => {
                  setDiscountValue(e.target.value);
                  if (e.target.value.trim()) setPromotionId('');
                }}
                className="!h-9"
              />
            </div>
            <Textarea
              label="Notes"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}
      </div>
    ) : null;

  const primaryCheckoutLabel = existingOrderId
    ? isHeldDraftOrder
      ? 'Place order'
      : 'Add to order'
    : 'Place order';
  const primaryCheckoutAmount = existingOrderId
    ? isHeldDraftOrder
      ? estimatedBillTotal
      : newItemsTotal
    : pricing.totalAmount;
  const primaryCheckoutDisabled =
    orderLocked ||
    (existingOrderId
      ? isHeldDraftOrder
        ? existingOrderLines.length === 0 && cartLines.length === 0
        : !cartLines.length
      : !cartLines.length);

  const punchOrderButton = (
    <Button
      type="button"
      variant="primary"
      className="w-full !h-14 !font-bold uppercase tracking-wide shadow-md !flex !items-center !justify-center !gap-2 !flex-wrap"
      disabled={primaryCheckoutDisabled}
      loading={isSubmitting}
      onClick={() => {
        if (existingOrderId && isHeldDraftOrder) {
          void handlePlaceHeldDraftOrder();
        } else {
          void handleSubmit(false);
        }
      }}
    >
      <span className="text-sm sm:text-base">{primaryCheckoutLabel}</span>
      <span className="font-mono text-2xl sm:text-3xl font-bold tabular-nums normal-case leading-none">
        {formatMoney(primaryCheckoutAmount)}
      </span>
    </Button>
  );

  const checkoutFooter = (
    <div className="w-full space-y-2">
      {existingOrderId && existingOrder && (
        <div className="space-y-1.5 font-caption border-b border-outline-variant/15 pb-3">
          <div className="flex justify-between gap-3">
            <span className="text-on-surface-variant">Current bill</span>
            <span className={CART_LINE_PRICE_CLASS}>{formatMoney(existingOrderTotal)}</span>
          </div>
          {cartLines.length > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-on-surface-variant">New items</span>
              <span className={CART_LINE_PRICE_CLASS}>+{formatMoney(newItemsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 pt-1">
            <span className="font-body-emphasis text-primary">Estimated bill</span>
            <span className="font-mono font-body-emphasis text-primary text-xl">
              {formatMoney(estimatedBillTotal)}
            </span>
          </div>
        </div>
      )}
      {!existingOrderId && cartLines.length > 0 && (
        <OrderPricingBreakdown
          pricing={pricing}
          formatMoney={formatMoney}
          taxPercentLabel={taxPercentLabel}
          discountLabel={discountLabel}
          compact
          showTotal
        />
      )}
      <div className="flex gap-2 w-full items-stretch">
        {waiterMode && !existingOrderId ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={!cartLines.length}
              loading={isSubmitting}
              onClick={() => void handleSubmit(true)}
            >
              Save draft
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-[2] py-3"
              disabled={!cartLines.length}
              loading={isSubmitting}
              onClick={() => void handleSubmit(false)}
            >
              Place order
            </Button>
          </>
        ) : showHoldActions ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-w-0 !h-14 !text-sm !font-semibold"
              disabled={!cartLines.length}
              loading={isSubmitting}
              onClick={() => void handleHoldOrder()}
            >
              Hold bill
            </Button>
            <div className="flex-[2] min-w-0 flex">{punchOrderButton}</div>
          </>
        ) : existingOrderId ? (
          <>
            {newBillExitButton('flex-1 min-w-0 !h-14')}
            <div className="flex-[2] min-w-0 flex">{punchOrderButton}</div>
          </>
        ) : (
          punchOrderButton
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`flex flex-col min-h-0 ${BILL_SCREEN_BG} overflow-hidden ${heightClass} ${
        exitHref ? 'pos-bill-immersive' : ''
      }`}
    >
      {weightItem && (
        <WeightEntryModal
          item={weightItem}
          open={!!weightItem}
          themeStyle={themeStyle}
          initialWeightG={
            editingLineKey ? cart[editingLineKey]?.weightG : pendingWeightG ?? undefined
          }
          confirmLabel={editingLineKey ? 'Update weight' : 'Add to order'}
          onClose={() => {
            setWeightItem(null);
            if (!customizationItem) {
              setEditingLineKey(null);
            }
          }}
          onConfirm={handleWeightConfirm}
        />
      )}

      {customizationItem && (
        <ItemCustomizationModal
          item={customizationItem}
          open={!!customizationItem}
          themeStyle={themeStyle}
          onClose={() => {
            setCustomizationItem(null);
            setEditingLineKey(null);
            setInitialSelection(undefined);
            setPendingWeightG(null);
          }}
          initialSelection={initialSelection}
          confirmLabel={editingLineKey ? 'Update item' : 'Add to order'}
          onConfirm={handleCustomizationConfirm}
          inventoryAvailability={inventoryAvailability}
        />
      )}

      <header
        className={`shrink-0 flex items-center gap-2 px-3 py-2 border-b ${BILL_SCREEN_BORDER} ${BILL_SCREEN_SURFACE} lg:hidden ${
          exitHref ? 'pt-safe' : ''
        }`}
      >
        {exitHref ? (
          <>
            <PosBillExitLink href={exitHref} />
            <PosBillFullscreenButton />
          </>
        ) : (
          <Link
            href={backHref}
            className="p-2 -ml-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant shrink-0"
          >
            <Icon name="arrow_back" />
          </Link>
        )}
        <div className="relative flex-1 min-w-0 max-w-xl">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items…"
            className="w-full h-9 pl-10 pr-3 rounded-full border border-outline-variant/25 bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-secondary/25"
          />
        </div>
        {showHoldActions && (
          <button
            type="button"
            onClick={() => setHeldOrdersOpen(true)}
            className="relative shrink-0 p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant"
            aria-label="Held orders"
          >
            <Icon name="pause_circle" className="text-xl" />
            {heldOrderCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                {heldOrderCount > 9 ? '9+' : heldOrderCount}
              </span>
            )}
          </button>
        )}
        {cartItemCount > 0 && (
          <button
            type="button"
            onClick={clearOrder}
            className="shrink-0 text-xs font-medium text-on-surface-variant hover:text-error cursor-pointer px-2"
          >
            Clear
          </button>
        )}
      </header>

      {heldOrderId && heldOrder?.isDraft && (
        <div className="shrink-0 px-4 py-2 font-caption border-b border-outline-variant/10 bg-amber-50 text-amber-900">
          Editing held order · changes replace the held copy when you hold or place again
        </div>
      )}

      {existingOrderId ? (
        <div
          className={`shrink-0 px-4 py-2 font-caption border-b border-outline-variant/10 ${
            orderLocked
              ? 'bg-error-container/30 text-error'
              : 'bg-secondary/10 text-secondary'
          }`}
        >
          {orderLocked ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>This order cannot accept more items.</span>
              <Link
                href={waiterMode ? `/${slug}/waiter/orders` : `/${slug}/orders`}
                className="font-body-emphasis underline"
              >
                Back to orders
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-body-emphasis">
                {isHeldDraftOrder ? 'Editing held order' : 'Adding to order'}{' '}
                {formatOrderLabel(existingOrder ?? existingOrderId ?? '')}
              </span>
              {newBillExitButton('', true)}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0 max-h-full overflow-hidden">
        <section
          className={`flex-[1.85] min-w-0 min-h-0 flex flex-col ${BILL_SCREEN_BG} overflow-hidden`}
        >
          <header
            className={`hidden lg:flex shrink-0 items-center gap-2 px-3 py-2 border-b ${BILL_SCREEN_BORDER} ${BILL_SCREEN_SURFACE}`}
          >
            {exitHref ? (
              <>
                <PosBillExitLink href={exitHref} />
                <PosBillFullscreenButton />
              </>
            ) : (
              <Link
                href={backHref}
                className="p-2 -ml-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant shrink-0"
              >
                <Icon name="arrow_back" />
              </Link>
            )}
            <div className="relative flex-1 min-w-0">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu items…"
                className="w-full h-9 pl-10 pr-3 rounded-full border border-outline-variant/25 bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-secondary/25"
              />
            </div>
            {showHoldActions && (
              <button
                type="button"
                onClick={() => setHeldOrdersOpen(true)}
                className="relative shrink-0 p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant"
                aria-label="Held orders"
              >
                <Icon name="pause_circle" className="text-xl" />
                {heldOrderCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                    {heldOrderCount > 9 ? '9+' : heldOrderCount}
                  </span>
                )}
              </button>
            )}
            {cartItemCount > 0 && (
              <button
                type="button"
                onClick={clearOrder}
                className="shrink-0 text-xs font-medium text-on-surface-variant hover:text-error cursor-pointer px-2"
              >
                Clear
              </button>
            )}
          </header>
          <div
            className={`shrink-0 px-3 py-1.5 border-b ${BILL_SCREEN_BORDER} ${BILL_SCREEN_BG} overflow-x-auto hide-scrollbar`}
          >
            <div className="flex gap-1.5">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryId(tab.id)}
                  className={`shrink-0 px-3 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    activeCategoryId === tab.id
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div
            className={`flex-1 min-h-0 overflow-y-auto px-3 py-2 ${
              cartItemCount > 0 || existingOrderId ? 'max-lg:pb-32' : 'max-lg:pb-14'
            }`}
          >
            {menuLoading && (
              <p className="text-sm text-on-surface-variant text-center py-12">Loading menu…</p>
            )}
            {!menuLoading && categories.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-12">
                No menu yet.{' '}
                <Link href={`/${slug}/menu`} className="text-secondary hover:underline">
                  Set up your menu
                </Link>
              </p>
            )}
            {!menuLoading && filteredCatalog.length === 0 && categories.length > 0 && (
              <p className="text-sm text-on-surface-variant text-center py-12">No items found.</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
              {filteredCatalog.map(({ item }) => (
                <PosCatalogCard
                  key={item.id}
                  item={item}
                  formatMoney={formatMoney}
                  qtyInCart={qtyByMenuItemId.get(item.id) ?? 0}
                  justAdded={flashItemId === item.id}
                  onAdd={() => handleCatalogClick(item)}
                />
              ))}
            </div>
          </div>
          {!waiterMode && (
            <PosLiveOrdersStripe
              slug={slug}
              tableMap={tableMap}
              business={business}
              receiptTemplate={receiptTemplate}
              currency={currency}
              selectedOrderId={existingOrderId}
              unpunchedDraftCounts={addDraftCounts}
              onOrderCompleted={(order) =>
                queuePrintBillPrompt(
                  order,
                  order.orderType === 'DELIVERY' ? 'order-delivered' : 'order-completed',
                )
              }
              onSelectOrder={handleStripeSelectOrder}
            />
          )}
        </section>

        <aside
          className={`hidden lg:flex w-[min(38vw,460px)] max-w-[480px] shrink-0 h-full max-h-full min-h-0 flex-col overflow-hidden ${BILL_SCREEN_SURFACE} border-l ${BILL_SCREEN_BORDER} shadow-[-3px_0_14px_-8px_rgba(0,0,0,0.07)]`}
        >
          {punchedOrder && !waiterMode ? (
            <div className="flex flex-col flex-1 min-h-0 px-5 py-8 justify-center gap-6">
              <div className="rounded-xl bg-secondary/10 border border-secondary/25 px-4 py-3 text-center space-y-2">
                <Icon name="check_circle" className="text-3xl text-secondary mx-auto" />
                <p className="text-sm font-semibold text-primary leading-snug">
                  Order {formatOrderLabel(punchedOrder)} punched
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <OrderTypeBadge orderType={punchedOrder.orderType} compact />
                  <span className="font-mono text-base font-bold text-on-surface tabular-nums">
                    {formatMoney(punchedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full !h-14 !text-base !font-semibold justify-center gap-2"
                  onClick={() => printPunchedBill(punchedOrder)}
                >
                  <Icon name="print" className="text-xl" />
                  Print bill
                </Button>
                {canAddItemsToOpenTab(punchedOrder) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full !h-14 !text-base !font-semibold justify-center gap-2"
                    onClick={() => handleAddMoreAfterPunch(punchedOrder)}
                  >
                    <Icon name="add_circle" className="text-xl" />
                    Add more items
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  className="w-full !h-[3.75rem] !text-base !font-bold justify-center gap-2 shadow-md"
                  onClick={handleNewBillAfterPunch}
                >
                  <Icon name="note_add" className="text-xl" />
                  New bill
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`shrink-0 px-2 py-2 border-b-2 border-primary/15 space-y-2 ${BILL_SCREEN_SURFACE}`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="text-sm font-bold text-primary truncate min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                      Current bill
                    </span>
                    <span className="mx-1.5 text-on-surface-variant/50 font-normal" aria-hidden>
                      ·
                    </span>
                    <span>{orderPanelTitle}</span>
                  </p>
                  {cartItemCount > 0 && (
                    <span className="text-[11px] font-semibold text-on-surface-variant tabular-nums shrink-0">
                      {cartItemCount} items
                    </span>
                  )}
                </div>
                {!existingOrderId && orderTypeSelector}
                {dineInTablePicker}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-1.5 space-y-2">
                {!existingOrderId && orderMode !== 'DINE_IN' && orderContextFields && (
                  <div className="pb-2 border-b border-outline-variant/10">{orderContextFields}</div>
                )}
                {cartItemsList}
              </div>
              <div
                className={`shrink-0 flex flex-col border-t ${BILL_SCREEN_BORDER} ${BILL_SCREEN_SURFACE} ${BILL_PANEL_SHADOW}`}
              >
                <div className="shrink-0 px-2 py-2 space-y-1.5 max-h-[min(180px,30vh)] overflow-y-auto overscroll-contain">
                  {existingOrderId && existingOrder && (
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between gap-2">
                        <span>Current bill</span>
                        <span className={`${CART_LINE_PRICE_CLASS} font-semibold`}>
                          {formatMoney(existingOrderTotal)}
                        </span>
                      </div>
                      {cartLines.length > 0 && (
                        <div className="flex justify-between gap-2 font-semibold text-primary">
                          <span>New items</span>
                          <span className={`${CART_LINE_PRICE_CLASS} text-primary`}>
                            +{formatMoney(newItemsTotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {!existingOrderId && cartLines.length > 0 && (
                    <OrderPricingBreakdown
                      pricing={pricing}
                      formatMoney={formatMoney}
                      taxPercentLabel={taxPercentLabel}
                      discountLabel={discountLabel}
                      compact
                      showTotal
                    />
                  )}
                </div>
                <div className="shrink-0 px-2 pb-1 overflow-visible">{orderExtrasAccordion}</div>
                <div
                  className={`shrink-0 flex gap-2 items-stretch px-2 py-2 pt-1 border-t ${BILL_SCREEN_BORDER} ${BILL_SCREEN_SURFACE}`}
                >
                  {existingOrderId ? (
                    <>
                      {newBillExitButton('flex-1 min-w-0 !h-14')}
                      <div className="flex-[2] min-w-0 flex">{punchOrderButton}</div>
                    </>
                  ) : (
                    <>
                      {showHoldActions && (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 min-w-0 !h-14 !text-sm !font-semibold"
                          disabled={!cartLines.length}
                          loading={isSubmitting}
                          onClick={() => void handleHoldOrder()}
                        >
                          Hold bill
                        </Button>
                      )}
                      <div
                        className={`${showHoldActions ? 'flex-[2]' : 'w-full'} min-w-0 flex`}
                      >
                        {punchOrderButton}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {(cartItemCount > 0 || existingOrderId) && (
        <div
          className="lg:hidden shrink-0 fixed bottom-[52px] left-0 right-0 z-40 p-3 safe-area-pb bg-gradient-to-t from-white via-white/95"
        >
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-primary text-on-primary shadow-lg cursor-pointer"
          >
            <span className="font-semibold">{cartItemCount} items</span>
            <span className="font-mono font-bold text-2xl tabular-nums">
              {formatMoney(existingOrderId ? estimatedBillTotal : pricing.totalAmount)}
            </span>
          </button>
        </div>
      )}

      <Drawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={existingOrderId ? 'Add to order' : 'Current bill'}
        width="lg"
        themeStyle={themeStyle}
        footer={checkoutFooter}
      >
        <div className="space-y-3 lg:hidden">
          {!existingOrderId && orderTypeSelector}
          {orderContextFields}
          {cartItemsList}
          {orderExtrasAccordion}
        </div>
      </Drawer>
      {PrintBillPrompt}

      {showHoldActions && (
        <HeldOrdersDrawer slug={slug} open={heldOrdersOpen} onClose={() => setHeldOrdersOpen(false)} />
      )}
    </div>
  );
}

function availableItemsFromCategories(
  categories: { id: string; name: string; items?: MenuItem[] }[],
  inventoryAvailability?: import('@/lib/api/types').InventoryAvailabilityMap,
) {
  return categories.flatMap((cat) =>
    (cat.items ?? [])
      .filter(
        (i) =>
          i.isAvailable &&
          isSellableInventoryOk(inventoryAvailability, i.id, null, []),
      )
      .map((item) => ({ item, categoryId: cat.id, categoryName: cat.name })),
  );
}
