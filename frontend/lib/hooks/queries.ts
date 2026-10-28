import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useTenantQueryEnabled } from '@/lib/auth/auth-context';
import {
  KITCHEN_QUEUE_STALE_MS,
  ORDER_LIST_STALE_MS,
  PROMOTIONS_STALE_MS,
  REFERENCE_GC_MS,
  REFERENCE_STALE_MS,
} from '@/lib/query-cache';
import type {
  AuthUser,
  Business,
  Customer,
  FloorPlan,
  FloorPlanScene,
  FloorTable,
  MenuCategory,
  ModifierGroup,
  Order,
  OrderFiltersMeta,
  OrderListFilters,
  OrdersQueryResult,
  PlatformBusiness,
  PlatformMetrics,
  PlatformTenantAnalyticsDetail,
  PlatformTenantAnalyticsRow,
  AuditLog,
  PublicTable,
  QrPayload,
  Reservation,
  Promotion,
  ReportDateRange,
  ReportFilters,
  SalesSummary,
  PaymentBreakdownItem,
  DailyRevenueItem,
  InvoiceRecord,
  ReportsDashboard,
  DashboardCharts,
  SalesReportDetail,
  ProductPerformanceRow,
  VariantPerformanceRow,
  ModifierPerformanceRow,
  PaymentReportRow,
  EmployeeReportRow,
  OrderTypeReportRow,
  TableReportRow,
  DeliveryReportRow,
  CustomerReportSummary,
  PromotionReportRow,
  PurchaseReportRow,
  WastageReportRow,
  InventoryReportRow,
  OrderReportRow,
  TipsReport,
  InventoryItem,
  InventoryMovement,
  InventoryAvailabilityMap,
  CashShift,
  CashShiftSummary,
  RiderPendingCash,
  RiderCashHandoffGroup,
} from '@/lib/api/types';
import { getReportPresetRange } from '@/lib/report-dates';

export interface MenuQueryData {
  menu: MenuCategory[];
  inventoryAvailability?: InventoryAvailabilityMap;
}

export function useCurrentUser(enabled?: boolean) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<{ user: AuthUser }>('/auth/me').then((d) => d.user),
    enabled: enabled ?? tenantReady,
  });
}

export function useBusiness() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['business', 'me'],
    queryFn: () => apiFetch<{ business: Business }>('/business/me').then((d) => d.business),
    enabled,
  });
}

export function useMenu() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['menu'],
    queryFn: () =>
      apiFetch<MenuQueryData>('/menu').then((d) => ({
        menu: d.menu,
        inventoryAvailability: d.inventoryAvailability,
      })),
    enabled,
    staleTime: REFERENCE_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

export function useInventoryItems() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () =>
      apiFetch<{ items: InventoryItem[] }>('/inventory/items').then((d) => d.items),
    enabled,
    staleTime: REFERENCE_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

export function useInventoryMovements(inventoryItemId?: string) {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory', 'movements', inventoryItemId ?? 'all'],
    queryFn: () => {
      const params = inventoryItemId
        ? `?inventoryItemId=${encodeURIComponent(inventoryItemId)}`
        : '';
      return apiFetch<{ movements: InventoryMovement[] }>(
        `/inventory/movements${params}`,
      ).then((d) => d.movements);
    },
    enabled,
  });
}

export function useModifierGroups() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['menu', 'modifier-groups'],
    queryFn: () =>
      apiFetch<{ modifierGroups: ModifierGroup[] }>('/menu/modifier-groups').then(
        (d) => d.modifierGroups,
      ),
    enabled,
    staleTime: REFERENCE_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

function serializeOrderFilters(filters?: OrderListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export function useHeldOrders() {
  return useOrders({
    isDraft: true,
    includeDrafts: true,
    statusGroup: 'active',
    limit: 50,
  });
}

/** Active (non-draft) orders for today — POS live-order stripe. */
export function usePosLiveOrders() {
  const { data: businessDayState } = useCurrentBusinessDay();
  const range = useMemo(
    () => getReportPresetRange('today', businessDayState?.businessDay ?? null),
    [businessDayState?.businessDay?.businessDate],
  );
  return useOrders(
    {
      statusGroup: 'active',
      dateFrom: range.from,
      dateTo: range.to,
      limit: 40,
    },
    { refetchInterval: 20_000 },
  );
}

export function useOrders(
  filters?: OrderListFilters,
  options?: { refetchInterval?: number | false },
) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeOrderFilters(filters);
  return useQuery({
    queryKey: ['orders', 'list', queryString],
    queryFn: () => {
      const q = queryString ? `?${queryString}` : '';
      return apiFetch<{ orders: Order[]; meta?: { total: number } }>(`/orders${q}`).then(
        (d): OrdersQueryResult => ({
          orders: d.orders,
          total: d.meta?.total ?? d.orders.length,
        }),
      );
    },
    enabled,
    staleTime: ORDER_LIST_STALE_MS,
    placeholderData: (previousData) => previousData,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

export function useOrderFilters() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['orders', 'filters'],
    queryFn: () =>
      apiFetch<{ filters: OrderFiltersMeta }>('/orders/filters').then((d) => d.filters),
    enabled,
    staleTime: 60_000,
  });
}

export function useKitchenQueue(status?: string) {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['kitchen', 'queue', status],
    queryFn: () => {
      const q = status ? `?status=${status}` : '';
      return apiFetch<{ orders: Order[] }>(`/kitchen/queue${q}`).then((d) => d.orders);
    },
    staleTime: KITCHEN_QUEUE_STALE_MS,
    enabled,
  });
}

export function useFloorTables(floorPlanId?: string) {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['floor-plan', 'tables', floorPlanId ?? 'all'],
    queryFn: () => {
      const q = floorPlanId ? `?floorPlanId=${floorPlanId}` : '';
      return apiFetch<{ tables: FloorTable[] }>(`/floor-plan/tables${q}`).then((d) => d.tables);
    },
    enabled,
    staleTime: REFERENCE_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

export function useFloorPlans() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['floor-plan', 'plans'],
    queryFn: () => apiFetch<{ plans: FloorPlan[] }>('/floor-plan/plans').then((d) => d.plans),
    enabled,
  });
}

export function useFloorPlanScene(planId: string | null) {
  const enabled = useTenantQueryEnabled() && !!planId;
  return useQuery({
    queryKey: ['floor-plan', 'scene', planId],
    queryFn: () => apiFetch<FloorPlanScene>(`/floor-plan/plans/${planId}`),
    enabled,
  });
}

export function useCustomers() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['customers'],
    queryFn: () =>
      apiFetch<{ customers: Customer[] }>('/customers').then((d) => d.customers),
    enabled,
    staleTime: REFERENCE_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

export function useCustomerSearch(search: string, enabled = true) {
  const tenantEnabled = useTenantQueryEnabled();
  const trimmed = search.trim();
  return useQuery({
    queryKey: ['customers', 'search', trimmed],
    queryFn: () =>
      apiFetch<{ customers: Customer[] }>(
        `/customers?search=${encodeURIComponent(trimmed)}`,
      ).then((d) => d.customers),
    enabled: tenantEnabled && enabled && trimmed.length > 0,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useSubscription() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () =>
      apiFetch<{ subscription: import('@/lib/api/types').TenantSubscription }>(
        '/billing/subscription',
      ).then((d) => d.subscription),
    enabled,
    refetchInterval: 60_000,
  });
}

export function usePaymentInstructions() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['billing', 'payment-instructions'],
    queryFn: () =>
      apiFetch<{ instructions: import('@/lib/api/types').PaymentInstructions }>(
        '/billing/payment-instructions',
      ).then((d) => d.instructions),
    enabled,
  });
}

export function useMyPaymentSubmissions() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['billing', 'payment-submissions'],
    queryFn: () =>
      apiFetch<{ submissions: import('@/lib/api/types').PaymentSubmission[] }>(
        '/billing/payment-submissions',
      ).then((d) => d.submissions),
    enabled,
  });
}

export function useInboxNotifications(options?: { unreadOnly?: boolean }) {
  const enabled = useTenantQueryEnabled();
  const unreadOnly = options?.unreadOnly ?? false;
  return useQuery({
    queryKey: ['notifications', 'inbox', unreadOnly ? 'unread' : 'all'],
    queryFn: () => {
      const q = unreadOnly ? '?unreadOnly=true' : '';
      return apiFetch<{
        notifications: import('@/lib/api/types').InboxNotification[];
        unreadCount: number;
        nextCursor: string | null;
      }>(`/notifications/inbox${q}`);
    },
    enabled,
    refetchInterval: 60_000,
  });
}

export function useInboxNotification(id: string | null) {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['notifications', 'inbox', id],
    queryFn: () =>
      apiFetch<{ notification: import('@/lib/api/types').InboxNotification }>(
        `/notifications/inbox/${id}`,
      ).then((d) => d.notification),
    enabled: enabled && Boolean(id),
  });
}

export function useNotificationPreferences() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () =>
      apiFetch<{ preferences: import('@/lib/api/types').NotificationPreferences }>(
        '/notifications/preferences',
      ).then((d) => d.preferences),
    enabled,
  });
}

export function useFeedbackContact() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['feedback', 'contact'],
    queryFn: () =>
      apiFetch<{ contact: import('@/lib/api/types').FeedbackContactSettings }>(
        '/feedback/contact',
      ).then((d) => d.contact),
    enabled,
  });
}

export function useFeedbackTickets() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['feedback', 'tickets'],
    queryFn: () =>
      apiFetch<{ tickets: import('@/lib/api/types').FeedbackTicket[] }>(
        '/feedback/tickets',
      ).then((d) => d.tickets),
    enabled,
  });
}

export function usePlatformFeedbackContact() {
  return useQuery({
    queryKey: ['platform', 'feedback', 'contact'],
    queryFn: () =>
      apiFetch<{ contact: import('@/lib/api/types').FeedbackContactSettings }>(
        '/platform/feedback/contact',
        { auth: 'platform' },
      ).then((d) => d.contact),
  });
}

export function usePlatformFeedbackTickets(filters?: {
  status?: string;
  businessId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.businessId) params.set('businessId', filters.businessId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['platform', 'feedback', 'tickets', filters],
    queryFn: () =>
      apiFetch<{ tickets: import('@/lib/api/types').FeedbackTicket[] }>(
        `/platform/feedback/tickets${q}`,
        { auth: 'platform' },
      ).then((d) => d.tickets),
  });
}

export function usePlatformDemoRequests(filters?: {
  status?: import('@/lib/api/types').DemoRequestStatus;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  const q = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['platform', 'demo', 'requests', filters],
    queryFn: () =>
      apiFetch<{ requests: import('@/lib/api/types').DemoRequest[] }>(
        `/platform/demo/requests${q}`,
        { auth: 'platform' },
      ).then((d) => d.requests),
  });
}

export function usePlatformBillingSettings() {
  return useQuery({
    queryKey: ['platform', 'billing', 'settings'],
    queryFn: () =>
      apiFetch<{ settings: import('@/lib/api/types').PlatformBillingSettings }>(
        '/platform/billing/settings',
        { auth: 'platform' },
      ).then((d) => d.settings),
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform', 'settings'],
    queryFn: () =>
      apiFetch<{ settings: import('@/lib/api/types').PlatformSettings }>('/platform/settings', {
        auth: 'platform',
      }).then((d) => d.settings),
  });
}

export function useMenuGalleryImages() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['menu', 'gallery-images'],
    queryFn: () =>
      apiFetch<{ images: import('@/lib/api/types').MenuGalleryImage[] }>('/menu/gallery-images').then(
        (d) => d.images,
      ),
    enabled,
    staleTime: REFERENCE_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

export function usePlatformMenuGallery() {
  return useQuery({
    queryKey: ['platform', 'menu-gallery'],
    queryFn: () =>
      apiFetch<{ images: import('@/lib/api/types').MenuGalleryImage[] }>('/platform/menu-gallery', {
        auth: 'platform',
      }).then((d) => d.images),
    staleTime: REFERENCE_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

export function usePlatformReceiptTemplate() {
  return useQuery({
    queryKey: ['platform', 'receipt-template'],
    queryFn: () =>
      apiFetch<{ template: import('@/lib/api/types').ReceiptTemplate }>('/platform/receipts', {
        auth: 'platform',
      }).then((d) => d.template),
  });
}

export function usePlatformBusinessReceiptTemplate(businessId: string) {
  return useQuery({
    queryKey: ['platform', 'receipt-template', businessId],
    queryFn: () =>
      apiFetch<import('@/lib/api/types').ReceiptTemplateBundle>(
        `/platform/receipts/businesses/${businessId}`,
        { auth: 'platform' },
      ),
    enabled: !!businessId,
  });
}

export function useReceiptTemplate() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['receipt-template'],
    queryFn: () =>
      apiFetch<{ template: import('@/lib/api/types').ReceiptTemplate }>(
        '/business/me/receipt-template',
      ).then((d) => d.template),
    enabled: tenantReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlatformPaymentSubmissions(filters?: {
  businessId?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.businessId) params.set('businessId', filters.businessId);
  if (filters?.status) params.set('status', filters.status);
  const q = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['platform', 'billing', 'payments', filters],
    queryFn: () =>
      apiFetch<{ submissions: import('@/lib/api/types').PaymentSubmission[] }>(
        `/platform/billing/payments${q}`,
        { auth: 'platform' },
      ).then((d) => d.submissions),
  });
}

export function usePublicMenu(slug: string) {
  return useQuery({
    queryKey: ['public', 'menu', slug],
    queryFn: () =>
      apiFetch<{
        business: Business;
        menu: MenuCategory[];
        inventoryAvailability?: InventoryAvailabilityMap;
        receiptTemplate?: import('@/lib/api/types').ReceiptTemplate;
      }>(`/public/${slug}`, {
        auth: 'none',
      }),
    enabled: !!slug,
  });
}

export function usePublicTable(slug: string, tableIdentifier: string) {
  return useQuery({
    queryKey: ['public', 'table', slug, tableIdentifier],
    queryFn: () =>
      apiFetch<{ business: Business; table: PublicTable }>(
        `/public/${slug}/tables/${encodeURIComponent(tableIdentifier)}`,
        { auth: 'none' },
      ),
    enabled: !!slug && !!tableIdentifier,
  });
}

export function usePublicOrder(slug: string, orderId: string, poll = false) {
  return useQuery({
    queryKey: ['public', 'order', slug, orderId],
    queryFn: () =>
      apiFetch<{
        order: Order;
        business?: Pick<Business, 'name' | 'logoUrl' | 'currency' | 'location' | 'phone'>;
        receiptTemplate?: import('@/lib/api/types').ReceiptTemplate;
      }>(`/public/${slug}/orders/${orderId}`, { auth: 'none' }),
    enabled: !!slug && !!orderId,
    refetchInterval: poll ? 5000 : false,
  });
}

export function useReservations(date?: string) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['reservations', date],
    queryFn: () => {
      const q = date ? `?date=${encodeURIComponent(date)}` : '';
      return apiFetch<{ reservations: Reservation[] }>(`/reservations${q}`).then(
        (d) => d.reservations,
      );
    },
    enabled: tenantReady,
  });
}

export function usePromotions(activeOnly = false) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['promotions', activeOnly],
    queryFn: () =>
      apiFetch<{ promotions: Promotion[] }>(
        `/promotions${activeOnly ? '?activeOnly=true' : ''}`,
      ).then((d) => d.promotions),
    enabled: tenantReady,
    staleTime: PROMOTIONS_STALE_MS,
    gcTime: REFERENCE_GC_MS,
  });
}

export function useCounterQr() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['qr', 'counter'],
    queryFn: () => apiFetch<{ qr: QrPayload }>('/qr/counter').then((d) => d.qr),
    enabled: tenantReady,
  });
}

export function useTableQr(tableId: string) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['qr', 'table', tableId],
    queryFn: () =>
      apiFetch<{ qr: QrPayload }>(`/qr/tables/${tableId}`).then((d) => d.qr),
    enabled: tenantReady && !!tableId,
  });
}

export function useOrder(id: string) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => apiFetch<{ order: Order }>(`/orders/${id}`).then((d) => d.order),
    enabled: tenantReady && !!id,
  });
}

export function usePlatformMe(enabled = true) {
  return useQuery({
    queryKey: ['platform', 'me'],
    queryFn: () =>
      apiFetch<{ user: import('@/lib/api/types').PlatformUser }>('/platform/auth/me', {
        auth: 'platform',
      }).then((d) => d.user),
    enabled,
  });
}

export function usePlatformBusinesses() {
  return useQuery({
    queryKey: ['platform', 'businesses'],
    queryFn: () =>
      apiFetch<{ businesses: PlatformBusiness[] }>('/platform/businesses', {
        auth: 'platform',
      }).then((d) => d.businesses),
  });
}

export function usePlatformBusiness(id: string | null) {
  return useQuery({
    queryKey: ['platform', 'businesses', id],
    queryFn: () =>
      apiFetch<{ business: PlatformBusiness }>(`/platform/businesses/${id}`, {
        auth: 'platform',
      }).then((d) => d.business),
    enabled: !!id,
  });
}

export function usePlatformSubscriptionRenewals(businessId: string | null) {
  return useQuery({
    queryKey: ['platform', 'businesses', businessId, 'renewals'],
    queryFn: () =>
      apiFetch<{ renewals: import('@/lib/api/types').SubscriptionRenewalRecord[] }>(
        `/platform/billing/businesses/${businessId}/renewals`,
        { auth: 'platform' },
      ).then((d) => d.renewals),
    enabled: Boolean(businessId),
  });
}

export function usePlatformBusinessSubscriptionInvoices(businessId: string | null) {
  return useQuery({
    queryKey: ['platform', 'businesses', businessId, 'subscription-invoices'],
    queryFn: () =>
      apiFetch<{
        invoices: Array<
          import('@/lib/api/types').SubscriptionInvoiceAlert & { alertActive?: boolean }
        >;
      }>(`/platform/billing/businesses/${businessId}/subscription-invoices`, {
        auth: 'platform',
      }).then((d) => d.invoices),
    enabled: Boolean(businessId),
  });
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: () =>
      apiFetch<{ metrics: PlatformMetrics }>('/platform/metrics', { auth: 'platform' }).then(
        (d) => d.metrics,
      ),
  });
}

export function usePlatformAuditLogs() {
  return useQuery({
    queryKey: ['platform', 'audit'],
    queryFn: () =>
      apiFetch<{ logs: AuditLog[] }>('/platform/metrics/audit-logs', { auth: 'platform' }).then(
        (d) => d.logs,
      ),
  });
}

export function usePlatformTenantAnalytics(from: string, to: string) {
  const qs = new URLSearchParams({ from, to }).toString();
  return useQuery({
    queryKey: ['platform', 'tenant-analytics', from, to],
    queryFn: () =>
      apiFetch<{ tenants: PlatformTenantAnalyticsRow[]; period: { from: string; to: string } }>(
        `/platform/tenant-analytics?${qs}`,
        { auth: 'platform' },
      ).then((d) => d.tenants),
    enabled: Boolean(from && to),
  });
}

export function usePlatformTenantAnalyticsDetail(
  businessId: string | null,
  from: string,
  to: string,
) {
  const qs = new URLSearchParams({ from, to }).toString();
  return useQuery({
    queryKey: ['platform', 'tenant-analytics', businessId, from, to],
    queryFn: () =>
      apiFetch<PlatformTenantAnalyticsDetail>(
        `/platform/tenant-analytics/${businessId}?${qs}`,
        { auth: 'platform' },
      ),
    enabled: Boolean(businessId && from && to),
  });
}

export function usePlatformAdmins() {
  return useQuery({
    queryKey: ['platform', 'admins'],
    queryFn: () =>
      apiFetch<{ admins: import('@/lib/api/types').PlatformUser[] }>('/platform/admins', {
        auth: 'platform',
      }).then((d) => d.admins),
  });
}

export function useStaff() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['staff'],
    queryFn: () =>
      apiFetch<{ staff: import('@/lib/api/types').StaffMember[] }>('/staff').then((d) => d.staff),
    enabled,
  });
}

function serializeReportRange(range?: ReportDateRange): string {
  if (!range) return '';
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  return params.toString();
}

export function useReportSummary(range?: ReportDateRange) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportRange(range);
  return useQuery({
    queryKey: ['reports', 'summary', queryString],
    queryFn: () => {
      const q = queryString ? `?${queryString}` : '';
      return apiFetch<{ summary: SalesSummary }>(`/reports/summary${q}`).then((d) => d.summary);
    },
    enabled: enabled && Boolean(range?.from && range?.to),
  });
}

export function useReportPaymentBreakdown(range?: ReportDateRange) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportRange(range);
  return useQuery({
    queryKey: ['reports', 'payment-breakdown', queryString],
    queryFn: () => {
      const q = queryString ? `?${queryString}` : '';
      return apiFetch<{ breakdown: PaymentBreakdownItem[] }>(`/reports/payment-breakdown${q}`).then(
        (d) => d.breakdown,
      );
    },
    enabled: enabled && Boolean(range?.from && range?.to),
  });
}

export function useReportDailyRevenue(range?: ReportDateRange) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportRange(range);
  return useQuery({
    queryKey: ['reports', 'daily-revenue', queryString],
    queryFn: () => {
      const q = queryString ? `?${queryString}` : '';
      return apiFetch<{ daily: DailyRevenueItem[] }>(`/reports/daily-revenue${q}`).then(
        (d) => d.daily,
      );
    },
    enabled: enabled && Boolean(range?.from && range?.to),
  });
}

export function useReportInvoices(
  range?: ReportDateRange,
  options?: { paymentMethod?: string; page?: number; limit?: number },
) {
  const enabled = useTenantQueryEnabled();
  const params = new URLSearchParams(serializeReportRange(range));
  if (options?.paymentMethod) params.set('paymentMethod', options.paymentMethod);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const queryString = params.toString();

  return useQuery({
    queryKey: ['reports', 'invoices', queryString],
    queryFn: () => {
      const q = queryString ? `?${queryString}` : '';
      return apiFetch<{ invoices: InvoiceRecord[]; meta?: { total: number } }>(
        `/reports/invoices${q}`,
      ).then((d) => ({
        invoices: d.invoices,
        total: d.meta?.total ?? d.invoices.length,
      }));
    },
    enabled: enabled && Boolean(range?.from && range?.to),
  });
}

function serializeReportFilters(filters?: ReportFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

function reportFiltersEnabled(filters?: ReportFilters): boolean {
  return Boolean(filters?.from && filters?.to);
}

export function useReportDashboard(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'dashboard', queryString],
    queryFn: () => {
      const q = queryString ? `?${queryString}` : '';
      return apiFetch<{ dashboard: ReportsDashboard; charts: DashboardCharts }>(
        `/reports/dashboard${q}`,
      );
    },
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportSales(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'sales', queryString],
    queryFn: () =>
      apiFetch<{ report: SalesReportDetail }>(`/reports/sales?${queryString}`).then(
        (d) => d.report,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportProducts(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'products', queryString],
    queryFn: () =>
      apiFetch<{ rows: ProductPerformanceRow[] }>(`/reports/products?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportProfit(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'profit', queryString],
    queryFn: () =>
      apiFetch<{
        summary: import('@/lib/api/types').ProfitReportSummary;
        rows: import('@/lib/api/types').ProfitReportRow[];
      }>(`/reports/profit?${queryString}`),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportVariants(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'variants', queryString],
    queryFn: () =>
      apiFetch<{ rows: VariantPerformanceRow[] }>(`/reports/variants?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportModifiers(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'modifiers', queryString],
    queryFn: () =>
      apiFetch<{ rows: ModifierPerformanceRow[] }>(`/reports/modifiers?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportPayments(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'payments', queryString],
    queryFn: () =>
      apiFetch<{ rows: PaymentReportRow[] }>(`/reports/payments?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportEmployees(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'employees', queryString],
    queryFn: () =>
      apiFetch<{ rows: EmployeeReportRow[] }>(`/reports/employees?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportOrderTypes(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'order-types', queryString],
    queryFn: () =>
      apiFetch<{ rows: OrderTypeReportRow[] }>(`/reports/order-types?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportTables(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'tables', queryString],
    queryFn: () =>
      apiFetch<{ rows: TableReportRow[] }>(`/reports/tables?${queryString}`).then((d) => d.rows),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportDelivery(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'delivery', queryString],
    queryFn: () =>
      apiFetch<{ rows: DeliveryReportRow[] }>(`/reports/delivery?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportCustomers(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'customers', queryString],
    queryFn: () =>
      apiFetch<{ summary: CustomerReportSummary }>(`/reports/customers?${queryString}`).then(
        (d) => d.summary,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportTips(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'tips', queryString],
    queryFn: () =>
      apiFetch<{ report: TipsReport }>(`/reports/tips?${queryString}`).then((d) => d.report),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportPromotions(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'promotions', queryString],
    queryFn: () =>
      apiFetch<{ rows: PromotionReportRow[] }>(`/reports/promotions?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportPurchases(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'purchases', queryString],
    queryFn: () =>
      apiFetch<{ rows: PurchaseReportRow[] }>(`/reports/purchases?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportWastage(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'wastage', queryString],
    queryFn: () =>
      apiFetch<{ rows: WastageReportRow[] }>(`/reports/wastage?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportInventory(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'inventory', queryString],
    queryFn: () =>
      apiFetch<{ rows: InventoryReportRow[] }>(`/reports/inventory?${queryString}`).then(
        (d) => d.rows,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export function useReportOrders(filters?: ReportFilters) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeReportFilters(filters);
  return useQuery({
    queryKey: ['reports', 'orders', queryString],
    queryFn: () =>
      apiFetch<{ rows: OrderReportRow[]; total: number; page: number; limit: number }>(
        `/reports/orders?${queryString}`,
      ),
    enabled: enabled && reportFiltersEnabled(filters),
  });
}

export interface WaiterDashboard {
  assignedTables: FloorTable[];
  myOrders: Order[];
  stats: {
    activeOrders: number;
    waitingForKitchen: number;
    preparing: number;
    ready: number;
    tablesRequiringAttention: number;
  };
  waitingForKitchen: Order[];
  preparing: Order[];
  readyOrders: Order[];
  tablesRequiringAttention: FloorTable[];
}

export function useWaiterDashboard() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['waiter', 'dashboard'],
    queryFn: () =>
      apiFetch<{ dashboard: WaiterDashboard }>('/waiter/dashboard').then((d) => d.dashboard),
    enabled: tenantReady,
  });
}

export function useWaiterOrders() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['waiter', 'orders'],
    queryFn: () =>
      apiFetch<{ orders: Order[] }>('/waiter/orders').then((d) => d.orders),
    enabled: tenantReady,
    staleTime: ORDER_LIST_STALE_MS,
  });
}

export interface RiderDashboard {
  deliveries: Order[];
  stats: {
    assigned: number;
    pickedUp: number;
    outForDelivery: number;
    deliveredToday: number;
  };
}

export function useRiderDashboard() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['rider', 'dashboard'],
    queryFn: () =>
      apiFetch<{ dashboard: RiderDashboard }>('/rider/dashboard').then((d) => d.dashboard),
    enabled: tenantReady,
  });
}

export function useRiderPendingCash() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['rider', 'cash-pending'],
    queryFn: () => apiFetch<RiderPendingCash>('/rider/cash-pending'),
    enabled: tenantReady,
    staleTime: 15_000,
  });
}

export function usePendingRiderHandoffs() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['cash-shifts', 'rider-handoffs', 'pending'],
    queryFn: () =>
      apiFetch<{ groups: RiderCashHandoffGroup[] }>('/cash-shifts/rider-handoffs/pending').then(
        (d) => d.groups,
      ),
    enabled: tenantReady,
    staleTime: 15_000,
  });
}

export function useDeliveryOrders(filters?: { status?: string }) {
  const tenantReady = useTenantQueryEnabled();
  const queryString = filters?.status ? `?status=${filters.status}` : '';
  return useQuery({
    queryKey: ['delivery', 'orders', queryString],
    queryFn: () =>
      apiFetch<{ orders: Order[] }>(`/delivery/orders${queryString}`).then((d) => d.orders),
    enabled: tenantReady,
  });
}

export function useRiders() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['delivery', 'riders'],
    queryFn: () =>
      apiFetch<{ riders: import('@/lib/api/types').RiderSummary[] }>('/delivery/riders').then(
        (d) => d.riders,
      ),
    enabled: tenantReady,
  });
}

export function useCurrentBusinessDay(options?: { enabled?: boolean }) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['business-days', 'current'],
    queryFn: () =>
      apiFetch<import('@/lib/api/types').CurrentBusinessDayState>('/business-days/current').then(
        (d) => ({
          businessDay: d.businessDay,
          lifecycle: d.lifecycle ?? {},
          currentBusinessDate: d.currentBusinessDate,
        }),
      ),
    enabled: tenantReady && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useBusinessDays(limit = 50) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['business-days', 'list', limit],
    queryFn: () =>
      apiFetch<{ businessDays: import('@/lib/api/types').BusinessDay[] }>(
        `/business-days?limit=${limit}`,
      ).then((d) => d.businessDays),
    enabled: tenantReady,
    staleTime: 30_000,
  });
}

export function useBusinessDaySummary(businessDayId: string | undefined) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['business-days', businessDayId, 'summary'],
    queryFn: () =>
      apiFetch<import('@/lib/api/types').BusinessDaySummary>(
        `/business-days/${businessDayId}/summary`,
      ),
    enabled: tenantReady && Boolean(businessDayId),
  });
}

export function useCurrentCashShift(options?: { enabled?: boolean }) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['cash-shifts', 'current'],
    queryFn: () => apiFetch<{ shift: CashShift | null }>('/cash-shifts/current').then((d) => d.shift),
    enabled: tenantReady && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useSettlementAccounts() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['cash-shifts', 'settlement-accounts'],
    queryFn: () =>
      apiFetch<{ accounts: import('@/lib/api/types').CashSettlementAccount[] }>(
        '/cash-shifts/settlement-accounts',
      ).then((d) => d.accounts),
    enabled: tenantReady,
    staleTime: 5 * 60_000,
  });
}

export function useCashShifts(filters?: { status?: 'OPEN' | 'CLOSED'; limit?: number }) {
  const tenantReady = useTenantQueryEnabled();
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const q = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['cash-shifts', 'list', filters],
    queryFn: () =>
      apiFetch<{ shifts: CashShift[] }>(`/cash-shifts${q}`).then((d) => d.shifts),
    enabled: tenantReady,
    staleTime: 30_000,
  });
}

export function useCashShiftSummary(shiftId: string | undefined) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['cash-shifts', shiftId, 'summary'],
    queryFn: () => apiFetch<CashShiftSummary>(`/cash-shifts/${shiftId}/summary`),
    enabled: tenantReady && Boolean(shiftId),
    staleTime: 15_000,
  });
}

export function useCurrentInventoryDailySession() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory-daily', 'current'],
    queryFn: () =>
      apiFetch<{ session: import('@/lib/api/types').InventoryDailySession | null }>(
        '/inventory/daily/current',
      ).then((d) => d.session),
    enabled: tenantReady,
    staleTime: 30_000,
  });
}

export function useInventoryDailyDashboard() {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory-daily', 'dashboard'],
    queryFn: () => apiFetch<import('@/lib/api/types').InventoryDailyDashboard>('/inventory/daily/dashboard'),
    enabled: tenantReady,
    staleTime: 15_000,
  });
}

export function useInventoryDailySummary(sessionId: string | undefined) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory-daily', sessionId, 'summary'],
    queryFn: () =>
      apiFetch<import('@/lib/api/types').InventoryDailySessionSummary>(
        `/inventory/daily/${sessionId}/summary`,
      ),
    enabled: tenantReady && Boolean(sessionId),
    staleTime: 15_000,
  });
}

export function useInventoryDailyMovements(sessionId: string | undefined) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory-daily', sessionId, 'movements'],
    queryFn: () =>
      apiFetch<{ movements: import('@/lib/api/types').InventoryDailyMovementLog[] }>(
        `/inventory/daily/${sessionId}/movements`,
      ).then((d) => d.movements),
    enabled: tenantReady && Boolean(sessionId),
    staleTime: 15_000,
  });
}

/** Supplier expenses UI — gated by `SUPPLIER_EXPENSES_ENABLED` in `@/lib/feature-flags`. */
export function useSuppliers(includeInactive = false) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory', 'suppliers', includeInactive ? 'all' : 'active'],
    queryFn: () =>
      apiFetch<{ suppliers: import('@/lib/api/types').SupplierAccount[] }>(
        `/inventory/suppliers${includeInactive ? '?includeInactive=true' : ''}`,
      ).then((d) => d.suppliers),
    enabled: tenantReady,
    staleTime: 30_000,
  });
}

export function useSupplierLedger(supplierId: string | undefined) {
  const tenantReady = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['inventory', 'suppliers', supplierId, 'ledger'],
    queryFn: () =>
      apiFetch<{
        supplier: import('@/lib/api/types').SupplierAccount;
        ledger: import('@/lib/api/types').SupplierLedgerEntry[];
      }>(`/inventory/suppliers/${supplierId}/ledger`),
    enabled: tenantReady && Boolean(supplierId),
    staleTime: 15_000,
  });
}

