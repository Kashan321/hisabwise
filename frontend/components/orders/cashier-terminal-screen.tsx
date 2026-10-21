'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { Icon } from '@/components/ui';
import { CashierTerminalPaymentModal } from '@/components/orders/cashier-terminal-payment-modal';
import { CustomerSearchField } from '@/components/orders/customer-search-field';
import { ItemCustomizationModal } from '@/components/orders/item-customization-modal';
import { APP_NAME } from '@/lib/config';
import { formatApiError } from '@/lib/api/errors';
import type { Customer, MenuItem, Order } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import {
  type CartLine,
  type CartLineSelection,
  cartLineKey,
  formatCartLineSummary,
  getItemDisplayPrice,
  itemNeedsCustomization,
  isCartLineValid,
  lineUnitPrice,
} from '@/lib/cart-line';
import {
  useAddOrderItems,
  useCreateOrder,
  useSendOrderToKitchen,
  useUpdateOrderStatus,
} from '@/lib/hooks/mutations';
import {
  useBusiness,
  useFloorTables,
  useMenu,
  useOrder,
  useOrders,
  usePromotions,
} from '@/lib/hooks/queries';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useFormatMoney, useBusinessCurrency } from '@/lib/hooks/use-business-currency';
import { usePrintBillPrompt } from '@/lib/hooks/use-print-bill-prompt';
import { formatOrderLabel } from '@/lib/order-display';
import { canAddItemsToOpenTab } from '@/lib/open-tab-order';
import {
  businessDeliveryCharge,
  DEFAULT_SERVICE_RATE_PERCENT,
  estimateOrderTotal,
  type ManualDiscount,
  resolveTaxRatePercent,
} from '@/lib/order-pricing';
import type { CompleteOrderPaymentPayload } from '@/lib/payment-methods';
import { orderToCartRecord } from '@/lib/order-cart';
import { useToast } from '@/lib/toast';
import type { PosOrderMode } from '@/lib/pos-draft-storage';

const ALL_CATEGORY_ID = '__all__';

type OrderMode = PosOrderMode;

const CATEGORY_BADGE_COLORS = [
  'text-emerald-700 bg-emerald-50',
  'text-amber-700 bg-amber-50',
  'text-rose-700 bg-rose-50',
  'text-sky-700 bg-sky-50',
  'text-purple-700 bg-purple-50',
  'text-slate-600 bg-slate-100',
];

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setTime(`${hours}:${minutes} ${ampm}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="text-base font-bold tracking-tight">{time}</span>;
}

function terminalStatusBadge(order: Order): { label: string; className: string } {
  if (order.isDraft) {
    return { label: 'Held', className: 'bg-amber-100 text-amber-800' };
  }
  switch (order.status) {
    case 'PREPARING':
      return { label: 'Preparing', className: 'bg-amber-100 text-amber-800' };
    case 'READY':
      return { label: 'Ready', className: 'bg-emerald-100 text-emerald-800' };
    case 'RECEIVED':
      return { label: 'Waiting', className: 'bg-sky-100 text-sky-800' };
    default:
      return { label: order.status, className: 'bg-slate-100 text-slate-700' };
  }
}

function orderContextLabel(order: Order): string {
  if (order.orderType === 'DINE_IN' && order.tableIdentifier) return `Table ${order.tableIdentifier}`;
  if (order.orderType === 'TAKEAWAY') return 'Takeaway';
  if (order.orderType === 'DELIVERY') return 'Delivery';
  return order.orderType?.replace('_', ' ') ?? 'Order';
}

function orderItemCount(order: Order): number {
  return order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function CashierTerminalScreen({ slug }: { slug: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const currency = useBusinessCurrency();
  const queryClient = useQueryClient();

  const { data: menuData, isLoading: menuLoading } = useMenu();
  const categories = menuData?.menu ?? [];
  const inventoryAvailability = menuData?.inventoryAvailability;
  const { data: tables = [] } = useFloorTables();
  const { data: business } = useBusiness();
  const { data: promotions = [] } = usePromotions(true);
  const { data: activeOrdersData, refetch: refetchOrders } = useOrders({
    statusGroup: 'active',
    includeDrafts: true,
    limit: 50,
  });
  const activeOrders = activeOrdersData?.orders ?? [];

  const createOrder = useCreateOrder();
  const addOrderItems = useAddOrderItems();
  const sendToKitchen = useSendOrderToKitchen();
  const updateOrderStatus = useUpdateOrderStatus();

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

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data: selectedOrder } = useOrder(selectedOrderId ?? '');

  const [orderMode, setOrderMode] = useState<OrderMode>('DINE_IN');
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
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);

  const [customizationItem, setCustomizationItem] = useState<MenuItem | null>(null);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [initialSelection, setInitialSelection] = useState<CartLineSelection | undefined>();

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    method: 'CASH' | 'CARD' | 'ONLINE';
    tendered: number;
    change: number;
  } | null>(null);

  const itemById = useMemo(() => {
    const map: Record<string, MenuItem> = {};
    for (const cat of categories) {
      for (const item of cat.items ?? []) {
        if (item.isAvailable) map[item.id] = item;
      }
    }
    return map;
  }, [categories]);

  const categoryNameByItemId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of categories) {
      for (const item of cat.items ?? []) {
        map[item.id] = cat.name;
      }
    }
    return map;
  }, [categories]);

  const cartLines = useMemo(() => Object.values(cart).filter((l) => l.quantity > 0), [cart]);

  const pricedCartLines = useMemo(
    () =>
      cartLines
        .filter((line) => isCartLineValid(itemById[line.menuItemId], line, inventoryAvailability))
        .map((line) => ({
          line,
          unitPrice: lineUnitPrice(
            itemById[line.menuItemId],
            line.modifierOptionIds,
            line.variantId,
          ),
        })),
    [cartLines, itemById, inventoryAvailability],
  );

  const cartSubtotal = useMemo(
    () => pricedCartLines.reduce((sum, entry) => sum + entry.unitPrice * entry.line.quantity, 0),
    [pricedCartLines],
  );

  const selectedPromotion = useMemo(
    () => promotions.find((p) => p.id === promotionId) ?? null,
    [promotions, promotionId],
  );

  const manualDiscount = useMemo((): ManualDiscount | null => {
    if (selectedPromotion || !discountType || !discountValue.trim()) return null;
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (discountType === 'PERCENTAGE' && value > 100) return null;
    return { type: discountType, value };
  }, [selectedPromotion, discountType, discountValue]);

  const pricing = useMemo(() => {
    const taxRate = resolveTaxRatePercent(taxRateCustomized ? taxRatePercent : '', business);
    const serviceRate = Math.min(1, Math.max(0, Number(serviceRatePercent) / 100 || 0));
    const deliveryAmount = orderMode === 'DELIVERY' ? businessDeliveryCharge(business) : 0;
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
    taxRateCustomized,
    taxRatePercent,
    business,
    serviceRatePercent,
    orderMode,
  ]);

  const discountLabel = manualDiscount
    ? manualDiscount.type === 'PERCENTAGE'
      ? `${manualDiscount.value}%`
      : 'Custom'
    : selectedPromotion?.title ?? null;

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const items: MenuItem[] = [];
    for (const cat of categories) {
      if (!cat.isActive) continue;
      if (activeCategoryId !== ALL_CATEGORY_ID && cat.id !== activeCategoryId) continue;
      for (const item of cat.items ?? []) {
        if (!item.isAvailable) continue;
        if (q && !item.name.toLowerCase().includes(q)) continue;
        items.push(item);
      }
    }
    return items;
  }, [categories, activeCategoryId, debouncedSearch]);

  const categoryTabs = useMemo(
    () => [
      { id: ALL_CATEGORY_ID, label: 'All' },
      ...categories.filter((c) => c.isActive).map((c) => ({ id: c.id, label: c.name })),
    ],
    [categories],
  );

  const displayTotal = selectedOrder && cartLines.length === 0
    ? Number(selectedOrder.totalAmount)
    : pricing.totalAmount;

  const displaySubtotal = selectedOrder && cartLines.length === 0
    ? Number(selectedOrder.subtotal)
    : pricing.subtotal;

  const displayDiscount = selectedOrder && cartLines.length === 0
    ? Number(selectedOrder.discountAmount ?? 0)
    : pricing.discountAmount;

  const displayTax = selectedOrder && cartLines.length === 0
    ? Number(selectedOrder.taxAmount ?? 0)
    : pricing.taxAmount;

  const orderLocked = selectedOrder
    ? !canAddItemsToOpenTab(selectedOrder) && cartLines.length === 0
    : false;

  const ticketLabel = selectedOrder
    ? formatOrderLabel(selectedOrder)
    : 'New ticket';

  const ticketContext = selectedOrder
    ? orderContextLabel(selectedOrder)
    : orderMode === 'DINE_IN' && tableId
      ? `Table ${tableMap[tableId] ?? '—'}`
      : orderMode.replace('_', ' ');

  const customerDisplayName = selectedOrder?.customerName || customerName || selectedCustomer?.name || 'Walk-in guest';
  const customerDisplayPhone =
    selectedOrder?.customerPhone || customerPhone || selectedCustomer?.phoneNumber || '';

  const loadOrderIntoWorkspace = useCallback((order: Order) => {
    setSelectedOrderId(order.id);
    if (order.isDraft) {
      setCart(orderToCartRecord(order));
      const mode = order.orderType;
      if (mode === 'DINE_IN' || mode === 'TAKEAWAY' || mode === 'DELIVERY') setOrderMode(mode);
      if (order.tableId) setTableId(order.tableId);
      if (order.customerId) setCustomerId(order.customerId);
      if (order.customerName) setCustomerName(order.customerName);
      if (order.customerPhone) setCustomerPhone(order.customerPhone);
      if (order.deliveryAddress) setDeliveryAddress(order.deliveryAddress);
      if (order.deliveryNotes) setDeliveryNotes(order.deliveryNotes);
      if (order.notes) setOrderNotes(order.notes);
    } else {
      setCart({});
    }
  }, []);

  function resetNewTicket() {
    setSelectedOrderId(null);
    setCart({});
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
    setOrderMode('DINE_IN');
  }

  async function applyCustomerSelection(customer: Customer | null) {
    setSelectedCustomer(customer);
    if (!customer) {
      setCustomerId('');
      return;
    }
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phoneNumber ?? '');
    if (customer.deliveryAddress) setDeliveryAddress(customer.deliveryAddress);
    try {
      const fresh = await apiFetch<Customer>(`/customers/${customer.id}`);
      if (fresh.deliveryAddress) setDeliveryAddress(fresh.deliveryAddress);
    } catch {
      /* use cached */
    }
  }

  function buildCartItems() {
    return Object.entries(cart)
      .filter(([, line]) => line.quantity > 0)
      .filter(([, line]) => isCartLineValid(itemById[line.menuItemId], line, inventoryAvailability))
      .map(([, line]) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        ...(line.modifierOptionIds.length ? { modifierOptionIds: line.modifierOptionIds } : {}),
      }));
  }

  function validateDeliveryDetails(): boolean {
    if (orderMode !== 'DELIVERY') return true;
    if (!deliveryAddress.trim()) {
      toast.error('Enter a delivery address.');
      return false;
    }
    if (!customerName.trim()) {
      toast.error('Enter the customer name for delivery.');
      return false;
    }
    if (!customerPhone.trim()) {
      toast.error('Enter the customer phone for delivery.');
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

  function handleAddItem(item: MenuItem) {
    if (orderLocked) {
      toast.error('This order cannot accept more items.');
      return;
    }
    if (itemNeedsCustomization(item)) {
      setCustomizationItem(item);
      setEditingLineKey(null);
      setInitialSelection(undefined);
      return;
    }
    const line: CartLine = {
      menuItemId: item.id,
      variantId: undefined,
      modifierOptionIds: [],
      quantity: 1,
    };
    const key = cartLineKey(line.menuItemId, line.modifierOptionIds, line.variantId);
    setCart((c) => {
      const existing = c[key];
      return {
        ...c,
        [key]: existing ? { ...existing, quantity: existing.quantity + 1 } : line,
      };
    });
  }

  function handleCustomizationConfirm(selection: CartLineSelection) {
    if (!customizationItem) return;
    if (editingLineKey) {
      const existing = cart[editingLineKey];
      if (existing) {
        const key = cartLineKey(
          customizationItem.id,
          selection.modifierOptionIds,
          selection.variantId,
        );
        setCart((c) => ({
          ...c,
          [key]: {
            menuItemId: customizationItem.id,
            variantId: selection.variantId,
            modifierOptionIds: selection.modifierOptionIds,
            quantity: existing.quantity,
          },
        }));
      }
    } else {
      const line: CartLine = {
        menuItemId: customizationItem.id,
        variantId: selection.variantId,
        modifierOptionIds: selection.modifierOptionIds,
        quantity: 1,
      };
      const key = cartLineKey(line.menuItemId, line.modifierOptionIds, line.variantId);
      setCart((c) => {
        const existing = c[key];
        return {
          ...c,
          [key]: existing ? { ...existing, quantity: existing.quantity + 1 } : line,
        };
      });
    }
    setCustomizationItem(null);
    setEditingLineKey(null);
    setInitialSelection(undefined);
  }

  function updateCartQty(lineKey: string, delta: number) {
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

  async function syncCartToServer(): Promise<Order | null> {
    const items = buildCartItems();
    if (!items.length) return selectedOrder ?? null;

    if (selectedOrderId && selectedOrder) {
      const updated = await addOrderItems.mutateAsync({
        orderId: selectedOrderId,
        items,
      });
      setCart({});
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      return updated.order;
    }

    if (!validateDeliveryDetails()) return null;
    const created = await createOrder.mutateAsync(buildCreateOrderPayload(items, false));
    setSelectedOrderId(created.order.id);
    setCart({});
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    return created.order;
  }

  async function handleHold() {
    const items = buildCartItems();
    if (!items.length) {
      toast.error('Add at least one item to hold.');
      return;
    }
    if (!validateDeliveryDetails()) return;
    try {
      if (selectedOrderId && selectedOrder?.isDraft) {
        await updateOrderStatus.mutateAsync({ id: selectedOrderId, status: 'CANCELLED' });
      }
      await createOrder.mutateAsync(buildCreateOrderPayload(items, true));
      toast.success('Order held — start a new order');
      void refetchOrders();
      resetNewTicket();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleKitchen() {
    const items = buildCartItems();
    if (!items.length && !selectedOrder?.isDraft) {
      toast.error('Add items before sending to kitchen.');
      return;
    }
    try {
      if (selectedOrder?.isDraft) {
        await sendToKitchen.mutateAsync(selectedOrder.id);
        toast.success('Order sent to kitchen');
        void refetchOrders();
        resetNewTicket();
        return;
      }
      const order = await syncCartToServer();
      if (!order) return;
      if (order.isDraft) {
        await sendToKitchen.mutateAsync(order.id);
      }
      toast.success('Order sent to kitchen');
      void refetchOrders();
      if (!selectedOrderId) resetNewTicket();
      else setCart({});
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handlePay() {
    try {
      let order = selectedOrder ?? null;
      const items = buildCartItems();

      if (items.length) {
        order = await syncCartToServer();
        if (!order) return;
      }

      if (!order) {
        toast.error('Add items or select an order to pay.');
        return;
      }

      if (order.isDraft) {
        await sendToKitchen.mutateAsync(order.id);
        order = (await apiFetch<{ order: Order }>(`/orders/${order.id}`)).order;
      }

      setPaymentOrderId(order.id);
      setPaymentTotal(Number(order.totalAmount));
      setPaymentSuccess(null);
      setPaymentOpen(true);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  function confirmPayment(payload: CompleteOrderPaymentPayload) {
    if (!paymentOrderId) return;
    const cashLine = payload.payments.find((line) => line.method === 'CASH');
    updateOrderStatus.mutate(
      {
        id: paymentOrderId,
        status: 'COMPLETED',
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        payments: payload.payments,
      },
      {
        onSuccess: (data) => {
          toast.success('Payment complete');
          void refetchOrders();
          const primaryMethod = payload.paymentMethod ?? 'CASH';
          setPaymentSuccess({
            method: primaryMethod === 'ONLINE' ? 'ONLINE' : primaryMethod === 'CARD' ? 'CARD' : 'CASH',
            tendered: cashLine?.amountReceived ?? cashLine?.amount ?? paymentTotal,
            change: cashLine?.changeGiven ?? 0,
          });
          queuePrintBillPrompt(data.order, 'order-completed');
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function finishPaymentAndReset() {
    setPaymentOpen(false);
    setPaymentOrderId(null);
    setPaymentSuccess(null);
    resetNewTicket();
  }

  function confirmNewOrder() {
    setNewOrderOpen(false);
    resetNewTicket();
  }

  function setDiscountPreset(pct: number) {
    setDiscountType('PERCENTAGE');
    setDiscountValue(String(pct));
    setPromotionId('');
  }

  function clearDiscount() {
    setDiscountType('');
    setDiscountValue('');
    setPromotionId('');
  }

  const isBusy =
    createOrder.isPending ||
    addOrderItems.isPending ||
    sendToKitchen.isPending ||
    updateOrderStatus.isPending;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100 text-slate-900 antialiased select-none">
      <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block shadow-sm" />
            <span className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 truncate">
              {business?.name ?? `${APP_NAME} POS`}
            </span>
          </div>
          <span className="text-slate-300 text-lg font-light hidden sm:inline">|</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Restaurant Terminal
          </span>
        </div>
        <div className="flex items-center gap-4 md:gap-8 shrink-0">
          <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full">
            <Icon name="person" className="text-slate-500 text-lg" />
            <span className="text-sm font-semibold text-slate-700">
              Cashier: <span className="text-slate-900 font-bold">{user?.name ?? '—'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Icon name="schedule" className="text-slate-400 text-lg" />
            <LiveClock />
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden min-h-0">
        {/* Left: orders */}
        <aside className="col-span-3 bg-white border-r border-slate-200 flex flex-col h-full p-3 md:p-4 overflow-hidden min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">Orders</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {activeOrders.length} active
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNewOrderOpen(true)}
            className="w-full h-11 md:h-12 mb-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.99] shrink-0"
          >
            <Icon name="add_circle" className="text-xl" />
            <span>+ New Order</span>
          </button>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
            {activeOrders.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No active orders</p>
            )}
            {activeOrders.map((order) => {
              const badge = terminalStatusBadge(order);
              const selected = selectedOrderId === order.id;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => loadOrderIntoWorkspace(order)}
                  className={`w-full text-left p-3.5 rounded-2xl cursor-pointer transition-all ${
                    selected
                      ? 'border-2 border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-base font-extrabold text-slate-900 truncate">
                      {formatOrderLabel(order)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                    <span className="font-semibold text-slate-800 truncate">{orderContextLabel(order)}</span>
                    <span className="shrink-0">{orderItemCount(order)} items</span>
                  </div>
                  <div
                    className={`flex items-center justify-between pt-2 border-t ${
                      selected ? 'border-emerald-200/70' : 'border-slate-100'
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-500">Total</span>
                    <span
                      className={`text-base font-extrabold ${
                        selected ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-center shrink-0">
            <span className="text-xs text-slate-600 font-bold">Tap any order to load ticket</span>
          </div>
        </aside>

        {/* Center: menu */}
        <section className="col-span-5 bg-slate-100 p-3 md:p-4 flex flex-col h-full overflow-hidden border-r border-slate-200 min-h-0">
          <div className="flex flex-col gap-2.5 mb-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base md:text-lg font-extrabold tracking-tight text-slate-900">
                What would you like to order?
              </h2>
              <span className="text-xs font-semibold text-slate-500 shrink-0">Tap any item to add</span>
            </div>
            <div className="relative w-full">
              <Icon name="search" className="absolute left-3.5 top-3 text-slate-400 text-xl" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search food by name..."
                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent shadow-sm"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-sm font-bold">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryId(tab.id)}
                  className={`px-4 py-2 rounded-xl shrink-0 ${
                    activeCategoryId === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 lg:grid-cols-3 gap-3 min-h-0 content-start">
            {menuLoading && (
              <p className="col-span-full text-center text-slate-500 py-12">Loading menu…</p>
            )}
            {!menuLoading && filteredItems.length === 0 && (
              <p className="col-span-full text-center text-slate-500 py-12">No items found</p>
            )}
            {filteredItems.map((item, index) => {
              const catName = categoryNameByItemId[item.id] ?? 'Menu';
              const badgeColor = CATEGORY_BADGE_COLORS[index % CATEGORY_BADGE_COLORS.length];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddItem(item)}
                  className="group bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer flex flex-col justify-between transition-all active:scale-[0.98] text-left min-h-[140px]"
                >
                  <div>
                    <span
                      className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${badgeColor}`}
                    >
                      {catName}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-snug line-clamp-2 group-hover:text-emerald-800 transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 group-hover:border-emerald-100">
                    <span className="text-sm md:text-base font-extrabold text-slate-900">
                      {formatMoney(getItemDisplayPrice(item))}
                    </span>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-700 transition-colors">
                      Tap to add
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: cart */}
        <aside className="col-span-4 bg-white flex flex-col h-full p-3 md:p-4 overflow-hidden min-h-0">
          <div className="flex flex-col gap-2 pb-3 border-b border-slate-200 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">Current Order</h2>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold truncate max-w-[50%]">
                {ticketLabel} · {ticketContext}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="person" className="text-slate-500 text-lg shrink-0" />
                <span className="text-sm font-bold text-slate-800 truncate">{customerDisplayName}</span>
                {customerDisplayPhone && (
                  <span className="text-xs text-slate-600 font-semibold shrink-0 hidden sm:inline">
                    ({customerDisplayPhone})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCustomerOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 shrink-0"
              >
                Change
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2.5 min-h-0">
            {selectedOrder?.items?.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="flex-1 pr-2 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{item.menuItemName}</h4>
                  <span className="text-xs font-semibold text-slate-500">
                    {item.quantity > 1 ? `${item.quantity} × ` : ''}
                    {formatMoney(item.unitPrice)}
                  </span>
                </div>
                <span className="text-sm font-extrabold text-slate-900 shrink-0">
                  {formatMoney(item.lineTotal)}
                </span>
              </div>
            ))}

            {cartLines.length === 0 && !selectedOrder?.items?.length && (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Icon name="shopping_bag" className="text-4xl mb-1 text-slate-300" />
                <span className="font-bold text-slate-600 text-sm">Cart is empty</span>
                <span className="text-xs text-slate-400 mt-0.5">Tap food items on the menu to begin</span>
              </div>
            )}

            {Object.entries(cart).map(([lineKey, line]) => {
              const item = itemById[line.menuItemId];
              if (!item || line.quantity <= 0) return null;
              const unit = lineUnitPrice(item, line.modifierOptionIds, line.variantId);
              const summary = formatCartLineSummary(item, {
                variantId: line.variantId,
                modifierOptionIds: line.modifierOptionIds,
              });
              return (
                <div
                  key={lineKey}
                  className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 pr-2 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4>
                    {summary.length > 0 && (
                      <p className="text-[11px] text-slate-500 truncate">{summary.join(' · ')}</p>
                    )}
                    <span className="text-xs font-semibold text-slate-500">
                      {line.quantity > 1 ? `${line.quantity} × ` : ''}
                      {formatMoney(unit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateCartQty(lineKey, -1)}
                        className="w-7 h-7 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                      >
                        −
                      </button>
                      <span className="w-7 text-center font-extrabold text-sm text-slate-900">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(lineKey, 1)}
                        className="w-7 h-7 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 w-14 text-right">
                      {formatMoney(unit * line.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((c) => {
                          const next = { ...c };
                          delete next[lineKey];
                          return next;
                        })
                      }
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Icon name="delete" className="text-lg" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 shrink-0">
            <div className="space-y-1.5 text-sm text-slate-600 mb-2.5">
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-slate-800">{formatMoney(displaySubtotal)}</span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between font-medium text-amber-700">
                  <span className="flex items-center gap-1">
                    Discount
                    {discountLabel && (
                      <span className="text-xs bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                        {discountLabel}
                      </span>
                    )}
                  </span>
                  <span className="font-bold">−{formatMoney(displayDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Tax</span>
                <span className="font-bold text-slate-800">{formatMoney(displayTax)}</span>
              </div>
            </div>

            <div className="border-t-2 border-slate-900 pt-2.5 pb-3 flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">TOTAL</span>
              <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatMoney(displayTotal)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2.5">
              {[
                { icon: 'percent', label: 'Discount', onClick: () => setDiscountOpen(true) },
                { icon: 'person', label: 'Customer', onClick: () => setCustomerOpen(true) },
                { icon: 'pause_circle', label: 'Hold', onClick: () => void handleHold() },
                { icon: 'soup_kitchen', label: 'Kitchen', onClick: () => void handleKitchen() },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={isBusy}
                  onClick={action.onClick}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold flex flex-col items-center justify-center transition-colors"
                >
                  <Icon name={action.icon} className="text-lg" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={isBusy || (cartLines.length === 0 && !selectedOrder)}
              onClick={() => void handlePay()}
              className="w-full h-14 md:h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-lg md:text-xl flex items-center justify-between px-5 md:px-6 shadow-lg shadow-emerald-700/20 transition-all"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <Icon name="payments" className="text-2xl md:text-3xl" />
                <span>PAY</span>
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tight">{formatMoney(displayTotal)}</span>
            </button>
          </div>
        </aside>
      </main>

      {customizationItem && (
        <ItemCustomizationModal
          item={customizationItem}
          open
          initialSelection={initialSelection}
          onClose={() => {
            setCustomizationItem(null);
            setEditingLineKey(null);
            setInitialSelection(undefined);
          }}
          onConfirm={handleCustomizationConfirm}
        />
      )}

      {/* New order modal */}
      {newOrderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">New Order</h3>
                <p className="text-sm text-slate-500">How is the customer ordering?</p>
              </div>
              <button
                type="button"
                onClick={() => setNewOrderOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 my-5">
              {(
                [
                  { mode: 'DINE_IN' as const, icon: 'restaurant', label: 'DINE IN' },
                  { mode: 'TAKEAWAY' as const, icon: 'shopping_bag', label: 'TAKEAWAY' },
                  { mode: 'DELIVERY' as const, icon: 'two_wheeler', label: 'DELIVERY' },
                ] as const
              ).map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setOrderMode(option.mode)}
                  className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                    orderMode === option.mode
                      ? 'border-2 border-emerald-600 bg-emerald-50/50'
                      : 'border border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <Icon
                    name={option.icon}
                    className={`text-3xl ${orderMode === option.mode ? 'text-emerald-700' : 'text-slate-700'}`}
                  />
                  <span className="font-extrabold text-sm text-slate-900">{option.label}</span>
                </button>
              ))}
            </div>

            {orderMode === 'DINE_IN' && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-800">Select table</span>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Available
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Occupied
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {tables.map((table) => {
                    const occupied = table.status === 'OCCUPIED';
                    const selected = tableId === table.id;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        disabled={occupied}
                        onClick={() => setTableId(table.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          selected
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                            : occupied
                              ? 'border-rose-200 bg-rose-50 opacity-70 cursor-not-allowed'
                              : 'border-slate-200 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        <span className="font-extrabold text-base">{table.tableIdentifier}</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            selected
                              ? 'bg-white text-emerald-800'
                              : occupied
                                ? 'bg-white text-rose-700'
                                : 'bg-white text-emerald-700'
                          }`}
                        >
                          {selected ? 'Active' : occupied ? 'Busy' : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {orderMode === 'DELIVERY' && (
              <div className="space-y-2 pt-2">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
                <input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Delivery address"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
            )}

            <button
              type="button"
              onClick={confirmNewOrder}
              className="mt-6 w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base transition-all"
            >
              Start order
            </button>
          </div>
        </div>
      )}

      {/* Customer modal */}
      {customerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Customer details</h3>
                <p className="text-sm text-slate-500">Search existing or add new customer</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="my-4">
              <CustomerSearchField
                selectedCustomer={selectedCustomer}
                onSelect={(customer) => void applyCustomerSelection(customer)}
                onClear={() => void applyCustomerSelection(null)}
              />
            </div>
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Or enter manually
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
              {orderMode === 'DELIVERY' && (
                <input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Delivery address"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              )}
              <button
                type="button"
                onClick={() => setCustomerOpen(false)}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
              >
                Save & link to order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount modal */}
      {discountOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Add discount</h3>
                <p className="text-sm text-slate-500">Apply order discount to ticket</p>
              </div>
              <button
                type="button"
                onClick={() => setDiscountOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="my-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Preset discount
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPreset(pct)}
                    className={`h-12 rounded-xl border font-extrabold text-sm ${
                      discountType === 'PERCENTAGE' && discountValue === String(pct)
                        ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearDiscount}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 font-bold text-rose-600 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mb-5 text-sm">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Current subtotal</span>
                <span className="font-bold text-slate-900">{formatMoney(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-bold">
                <span>Discount applied</span>
                <span>−{formatMoney(pricing.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>New total</span>
                <span className="text-emerald-700">{formatMoney(pricing.totalAmount)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDiscountOpen(false)}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base"
            >
              Apply discount
            </button>
          </div>
        </div>
      )}

      <CashierTerminalPaymentModal
        open={paymentOpen}
        onClose={() => {
          if (!updateOrderStatus.isPending) finishPaymentAndReset();
        }}
        orderLabel={paymentOrderId ? formatOrderLabel(paymentOrderId) : ticketLabel}
        orderContext={ticketContext}
        totalAmount={paymentTotal}
        loading={updateOrderStatus.isPending}
        success={paymentSuccess}
        onConfirm={confirmPayment}
        onFinish={finishPaymentAndReset}
      />

      {PrintBillPrompt}
    </div>
  );
}
