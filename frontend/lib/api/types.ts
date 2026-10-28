export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: unknown };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  businessId: string;
  businessSlug: string;
  roles: string[];
  permissions: string[];
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN';
  permissions: string[];
  isActive?: boolean;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  location?: string | null;
  city?: string | null;
  branchNumber?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  currency?: string | null;
  subscriptionStatus?: string;
  allowNegativeInventory?: boolean;
  orderTicketPrefix?: string;
  orderTicketResetDaily?: boolean;
  businessDayStartTime?: string;
  businessDayTimezone?: string;
  businessDayAutoCloseEnabled?: boolean;
  businessDayCloseReminderEnabled?: boolean;
  defaultTaxRate?: number | string;
  defaultDeliveryCharge?: number | string;
}

export type BusinessDayReminderCode = 'ROLLOVER_STALE_DAY' | 'OPEN_SHIFTS_BLOCKING_CLOSE';

export interface BusinessDayLifecycleReminder {
  code: BusinessDayReminderCode;
  openBusinessDate: string;
  currentBusinessDate: string;
  businessDayId: string;
  hasOpenShifts: boolean;
}

export interface BusinessDayLifecycle {
  reminder?: BusinessDayLifecycleReminder;
  autoClosed?: {
    businessDayId: string;
    businessDate: string;
  };
}

export interface CurrentBusinessDayState {
  businessDay: BusinessDay | null;
  lifecycle: BusinessDayLifecycle;
  currentBusinessDate?: string;
}

export interface BusinessDay {
  id: string;
  businessId: string;
  businessDate: string;
  startedAt: string;
  endedAt: string | null;
  status: 'OPEN' | 'CLOSED';
  lastOrderSequence: number;
  openCount: number;
  closeCount: number;
  lastOpenedAt: string;
  openedById: string;
  closedById: string | null;
  openedByName: string | null;
  closedByName: string | null;
}

export interface BusinessDaySummary {
  businessDay: BusinessDay;
  orderCount: number;
  totalSales: string;
  shifts: Array<{
    shiftId: string;
    status: string;
    openedAt: string;
    closedAt: string | null;
    openedByName: string;
    orderCount: number;
    sales: number;
  }>;
}

export type InventoryUnit = 'KG' | 'G' | 'LITER' | 'ML' | 'PIECE' | 'PACK' | 'BOTTLE';
export type InventoryTrackingMode = 'NONE' | 'SIMPLE_STOCK' | 'RECIPE';
export type InventoryStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type SellableInventoryStatus = 'available' | 'low' | 'out_of_stock' | 'not_tracked';

export interface SellableAvailability {
  status: SellableInventoryStatus;
  availableUnits?: number;
}

export interface InventoryAvailabilityMap {
  menuItems: Record<string, SellableAvailability>;
  variants: Record<string, SellableAvailability>;
  modifierOptions: Record<string, SellableAvailability>;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: InventoryUnit;
  currentQuantity: string;
  minThreshold: string | null;
  isActive: boolean;
  stockStatus: InventoryStockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  type: string;
  quantityDelta: string;
  quantityAfter: string;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

export type InventoryWastageReason =
  | 'SPOILED'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'PREPARATION_WASTE'
  | 'OTHER';

export interface InventoryDailySession {
  id: string;
  sessionDate: string;
  shiftName: string | null;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  openingNotes: string | null;
  closingNotes: string | null;
  openedById: string;
  openedByName: string;
  closedById: string | null;
  closedByName: string | null;
}

export interface InventoryDailyItemSummary {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  openingQuantity: string;
  purchased: string;
  salesConsumption: string;
  wastage: string;
  adjustments: string;
  saleReversals: string;
  expectedClosing: string;
  actualClosing: string | null;
  variance: string | null;
  currentStock: string;
  stockStatus: InventoryStockStatus;
}

export interface SupplierAccount {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  openingBalanceOwed: string;
  isActive: boolean;
  totalPurchased: string;
  totalPaid: string;
  balanceDue: string;
  purchaseCount: number;
  paymentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  type: 'PURCHASE' | 'PAYMENT';
  date: string;
  amount: string;
  direction: 'debit' | 'credit';
  label: string;
  reference: string | null;
  createdByName: string;
}

export interface SupplierPaymentRecord {
  id: string;
  supplierId: string;
  amount: string;
  paidAt: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  createdByName: string;
  createdAt: string;
}

export interface InventoryPurchaseRecord {
  id: string;
  inventoryItemId: string;
  itemName: string;
  unit: string;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  supplier: string | null;
  supplierId?: string | null;
  invoiceRef: string | null;
  notes: string | null;
  purchasedAt: string;
  createdByName: string;
}

export interface InventoryDailyMovementLog {
  id: string;
  inventoryItemId: string;
  itemName: string;
  unit: string;
  type: string;
  quantityDelta: string;
  quantityBefore: string;
  quantityAfter: string;
  orderId: string | null;
  wastageReason: InventoryWastageReason | null;
  unitCost: string | null;
  note: string | null;
  createdByName: string;
  createdAt: string;
}

export interface InventoryDailySessionSummary {
  session: InventoryDailySession;
  items: InventoryDailyItemSummary[];
  purchases: InventoryPurchaseRecord[];
  totals: {
    openingQuantity: string;
    purchased: string;
    salesConsumption: string;
    wastage: string;
    adjustments: string;
    expectedClosing: string;
    actualClosing: string;
    openingStockValue: string;
    totalPurchasesValue: string;
    totalWastageValue: string;
    salesConsumptionValue: string;
    totalInventoryOutflow: string;
    totalSalesRevenue: string;
    completedOrderCount: string;
    closingStockValue: string;
    varianceValue: string;
  };
  alerts: {
    lowStock: InventoryDailyItemSummary[];
    outOfStock: InventoryDailyItemSummary[];
    highVariance: InventoryDailyItemSummary[];
  };
}

export interface InventoryDailyDashboard {
  mode: 'open' | 'closed' | 'none';
  session?: InventoryDailySession;
  items?: InventoryDailyItemSummary[];
  purchases?: InventoryPurchaseRecord[];
  totals?: InventoryDailySessionSummary['totals'];
  alerts?: InventoryDailySessionSummary['alerts'];
}

export interface RecipeLineInput {
  inventoryItemId: string;
  quantity: number;
  unit: InventoryUnit;
}

export interface SellableInventoryConfig {
  trackingMode: InventoryTrackingMode;
  inventoryItemId: string | null;
  recipeLines: Array<{ inventoryItemId: string; quantity: string; unit: InventoryUnit }>;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: string | number;
  isAvailable: boolean;
  displayOrder: number;
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price: string | number;
  basePrice?: string | number | null;
  isAvailable: boolean;
  displayOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export type MenuPricingType = 'FIXED' | 'BY_WEIGHT';

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  basePrice?: string | number | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  displayOrder: number;
  categoryId: string;
  pricingType?: MenuPricingType;
  pricePerKg?: string | number | null;
  pricingUnitG?: number | null;
  minWeightG?: number | null;
  weightStepG?: number | null;
  quickWeightsG?: number[] | null;
  priceRounding?: number | null;
  modifierGroups?: ModifierGroup[];
  variants?: MenuItemVariant[];
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR';
export type DeliveryStatus = 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
export type OrderChangeRequestType = 'CANCEL_ORDER' | 'REMOVE_ITEM' | 'MODIFY_ITEM';
export type OrderChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OrderPayment {
  id: string;
  method: string;
  amount: string | number;
  amountReceived?: string | number | null;
  changeGiven?: string | number | null;
  referenceNumber?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  status: string;
  source: string;
  orderType?: OrderType;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  payments?: OrderPayment[];
  subtotal: string | number;
  totalAmount: string | number;
  discountAmount?: string | number;
  taxAmount?: string | number;
  serviceAmount?: string | number;
  deliveryAmount?: string | number;
  notes?: string | null;
  promotionTitle?: string | null;
  createdAt: string;
  items?: OrderItem[];
  tableId?: string | null;
  tableIdentifier?: string | null;
  customerId?: string | null;
  promotionId?: string | null;
  waiterId?: string | null;
  waiterName?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  riderId?: string | null;
  riderName?: string | null;
  deliveryStatus?: DeliveryStatus | null;
  isDraft?: boolean;
  sentToKitchenAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  ticketNumber?: number | null;
  ticketPrefix?: string | null;
  ticketLabel?: string | null;
  businessDayId?: string | null;
  cashShiftId?: string | null;
  preparedById?: string | null;
  preparedByName?: string | null;
  preparedAt?: string | null;
  kitchenTicketId?: string;
  orderId?: string;
  batchNumber?: number;
  batchLabel?: string | null;
}

export interface OrderChangeRequest {
  id: string;
  orderId: string;
  type: OrderChangeRequestType;
  status: OrderChangeRequestStatus;
  reason?: string | null;
  createdAt: string;
}

export interface RiderSummary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface OrderListFilters {
  status?: string;
  statusGroup?: 'all' | 'active' | 'completed' | 'cancelled';
  source?: string;
  orderType?: OrderType;
  tableId?: string;
  tableIdentifier?: string;
  waiterId?: string;
  riderId?: string;
  deliveryStatus?: DeliveryStatus;
  isDraft?: boolean;
  includeDrafts?: boolean;
  limit?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  minTotal?: number;
  maxTotal?: number;
}

export interface OrdersQueryResult {
  orders: Order[];
  total: number;
}

export interface OrderFilterOption {
  value: string;
  label: string;
}

export interface OrderFiltersMeta {
  sources: OrderFilterOption[];
  tables: Array<{ id: string; tableIdentifier: string }>;
  statusGroups: OrderFilterOption[];
  paymentMethods: OrderFilterOption[];
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  menuItemName: string;
  variantId?: string | null;
  variantName?: string | null;
  variantPrice?: string | number | null;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
  weightG?: number | null;
  unitPricePerKg?: string | number | null;
  customizationNotes?: string | null;
  isKitchenAddition?: boolean;
  modifiers?: Array<{
    id?: string;
    modifierOptionId?: string | null;
    modifierName: string;
    priceAdjustment: string | number;
  }>;
}

export interface ReportDateRange {
  from?: string;
  to?: string;
}

export interface SalesSummary {
  totalRevenue: string;
  orderCount: number;
  averageTicket: string;
  totalDiscount: string;
  totalTax: string;
  totalService: string;
  cancelledCount: number;
}

export interface PaymentBreakdownItem {
  paymentMethod: string;
  orderCount: number;
  totalAmount: string;
}

export interface DailyRevenueItem {
  date: string;
  orderCount: number;
  totalAmount: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  tableIdentifier: string | null;
  source: string;
  paymentMethod: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  serviceAmount: string;
  totalAmount: string;
  itemCount: number;
}

export interface ReportFilters extends ReportDateRange {
  businessDayId?: string;
  orderType?: string;
  paymentMethod?: string;
  employeeId?: string;
  categoryId?: string;
  menuItemId?: string;
  tableId?: string;
  riderId?: string;
  inventoryItemId?: string;
  supplier?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'quantity' | 'revenue';
}

export interface ReportsDashboard {
  grossSales: string;
  netSales: string;
  totalOrders: number;
  averageOrderValue: string;
  totalDiscounts: string;
  totalTax: string;
  totalServiceCharges: string;
  totalTips: string;
  tipsAvailable: boolean;
  refunds: string;
  refundsAvailable: boolean;
  totalPurchases: string;
  wastageValue: string;
  cancelledOrders: number;
}

export interface DashboardCharts {
  salesOverTime: Array<{ bucket: string; revenue: string; orderCount: number }>;
  salesByOrderType: OrderTypeReportRow[];
  salesByPaymentMethod: PaymentReportRow[];
  topProducts: ProductPerformanceRow[];
}

export interface SalesReportDetail {
  grossSales: string;
  subtotal: string;
  discounts: string;
  taxes: string;
  serviceCharges: string;
  tips: string;
  tipsAvailable: boolean;
  refunds: string;
  refundsAvailable: boolean;
  netSales: string;
  orderCount: number;
  averageOrderValue: string;
  trend: Array<{ bucket: string; orderCount: number; revenue: string }>;
  formulas: Record<string, string>;
}

export interface ProductPerformanceRow {
  menuItemId: string;
  name: string;
  categoryName: string | null;
  quantitySold: number;
  revenue: string;
  averageSellingPrice: string;
  orderCount: number;
  totalWeightKg?: string | null;
  averagePricePerKg?: string | null;
}

export interface ProfitReportSummary {
  revenue: string;
  estimatedCost: string;
  estimatedProfit: string;
  estimatedMarginPercent: string | null;
  quantitySold: number;
  quantityWithCost: number;
  quantityMissingCost: number;
}

export interface ProfitReportRow {
  rowKey: string;
  menuItemId: string | null;
  variantId: string | null;
  name: string;
  categoryName: string | null;
  quantitySold: number;
  revenue: string;
  estimatedCost: string;
  estimatedProfit: string;
  estimatedMarginPercent: string | null;
}

export interface VariantPerformanceRow {
  variantId: string;
  variantName: string;
  parentProductName: string;
  quantitySold: number;
  revenue: string;
}

export interface ModifierPerformanceRow {
  modifierOptionId: string | null;
  modifierName: string;
  parentProductName: string;
  timesSelected: number;
  additionalRevenue: string;
}

export interface PaymentReportRow {
  method: string;
  transactionCount: number;
  totalAmount: string;
  refundAmount: string;
  netAmount: string;
  tips: string;
}

export interface EmployeeReportRow {
  employeeId: string;
  employeeName: string;
  roleHint: string;
  ordersProcessed: number;
  salesTotal: string;
  discounts: string;
  tips: string;
}

export interface OrderTypeReportRow {
  orderType: string;
  orderCount: number;
  revenue: string;
  averageOrderValue: string;
  discounts: string;
  serviceCharges: string;
}

export interface TableReportRow {
  tableId: string;
  tableIdentifier: string;
  orderCount: number;
  revenue: string;
  averageOrderValue: string;
}

export interface DeliveryReportRow {
  riderId: string;
  riderName: string;
  assigned: number;
  completed: number;
  cancelled: number;
  pending: number;
  deliverySales: string;
}

export interface CustomerReportSummary {
  totalCustomers: number;
  customersWithOrders: number;
  totalOrders: number;
  totalSpending: string;
  averageOrderValue: string;
  topCustomers: Array<{
    customerId: string;
    name: string;
    orderCount: number;
    totalSpent: string;
    averageOrderValue: string;
    loyaltyPoints: number;
  }>;
}

export interface PromotionReportRow {
  promotionId: string;
  title: string;
  useCount: number;
  totalDiscount: string;
  revenue: string;
  averageOrderValue: string;
}

export interface PurchaseReportRow {
  id: string;
  purchasedAt: string;
  supplier: string | null;
  itemName: string;
  quantity: string;
  unit: string;
  unitCost: string | null;
  totalCost: string | null;
  invoiceRef: string | null;
  addedByName: string;
}

export interface WastageReportRow {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
  reason: string | null;
  note: string | null;
  employeeName: string;
  createdAt: string;
  estimatedValue: string | null;
}

export interface InventoryReportRow {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  currentStock: string;
  stockStatus: string;
  opening: string;
  purchased: string;
  salesConsumption: string;
  wastage: string;
  adjustments: string;
  expectedClosing: string;
}

export interface OrderReportRow {
  id: string;
  ticketNumber: string | null;
  createdAt: string;
  orderType: string;
  source: string;
  status: string;
  tableIdentifier: string | null;
  customerName: string | null;
  createdByName: string | null;
  waiterName: string | null;
  riderName: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  serviceAmount: string;
  totalAmount: string;
  paymentMethod: string | null;
  itemCount: number;
}

export interface TipsReport {
  tipsAvailable: boolean;
  totalTips: string;
  tippedOrderCount: number;
  averageTip: string;
  byEmployee: Array<{ employeeId: string; employeeName: string; tips: string }>;
  note: string;
}

export type TableShape = 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'BOOTH';
export type FloorElementType = 'DOOR' | 'WINDOW' | 'RECEPTION_COUNTER' | 'WALL';

export interface FloorPlan {
  id: string;
  name: string;
  level: number;
  width: number;
  height: number;
  sortOrder: number;
  tableCount?: number;
}

export interface FloorElement {
  id: string;
  floorPlanId: string;
  type: FloorElementType;
  layoutX: number;
  layoutY: number;
  width: number;
  height: number;
  rotation: number;
  options: Record<string, unknown> | null;
}

export interface FloorPlanScene {
  plan: FloorPlan;
  tables: FloorTable[];
  elements: FloorElement[];
}

export interface FloorTable {
  id: string;
  floorPlanId?: string;
  tableIdentifier: string;
  layoutX: number;
  layoutY: number;
  width: number;
  height: number;
  capacity: number;
  shape: TableShape;
  rotation: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'NEEDS_CLEANING';
  assignedWaiterId?: string | null;
  assignedWaiterName?: string | null;
  activeOrder?: Order | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  deliveryAddress?: string | null;
  loyaltyPoints: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface PlatformBusiness {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  subscriptionStatus: string;
  isSuspended: boolean;
  isSubscriptionBlocked?: boolean;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  billingInterval?: string | null;
  customMonthlyPrice?: number | null;
  effectiveMonthlyPrice?: number;
  accessPhase?: SubscriptionAccessPhase;
  periodEndsAt?: string | null;
  daysRemaining?: number | null;
  daysExpired?: number | null;
  hasPendingPayment?: boolean;
  tempAccessUntil?: string | null;
  createdAt: string;
  userCount: number;
  orderCount: number;
  ownerEmail?: string | null;
  ownerName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
}

export interface SubscriptionRenewalRecord {
  id: string;
  businessId: string;
  source: string;
  durationMonths: number;
  periodStartsAt: string;
  periodEndsAt: string;
  finalAmount: string | number;
  currency: string;
  note?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
}

export interface PlatformTenantAnalyticsRow {
  businessId: string;
  name: string;
  slug: string;
  currency: string | null;
  subscriptionStatus: string;
  isSuspended: boolean;
  orderCount: number;
  revenue: string;
}

export interface PlatformTenantAnalyticsDetail {
  business: {
    id: string;
    name: string;
    slug: string;
    currency: string | null;
    subscriptionStatus: string;
    isSuspended: boolean;
  };
  period: { from: string; to: string };
  sales: SalesReportDetail;
  topProducts: ProductPerformanceRow[];
  payments: PaymentReportRow[];
  orderTypes: OrderTypeReportRow[];
}

export type {
  ReceiptTemplate,
  ReceiptTemplateOverride,
  ReceiptTemplateBundle,
} from '@/lib/receipt/receipt-template';

export interface PlatformSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  calendlyUrl?: string | null;
}

export interface MenuGalleryImage {
  id: string;
  label: string;
  searchTerms: string | null;
  imageUrl: string;
  imageReadUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPricingPlan {
  interval: 'MONTHLY' | 'YEARLY';
  price: number;
  currency: string;
  monthlyEquivalent?: number;
  savingsPercent?: number;
}

export interface PublicPricing {
  defaultTrialDays: number;
  currency: string;
  plans: {
    monthly: PublicPricingPlan;
    yearly: PublicPricingPlan;
  };
}

export interface PublicDemoConfig {
  calendlyUrl: string | null;
}

export type DemoRequestStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'CONTACTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DemoRequest {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  scheduledAt?: string | null;
  eventName?: string | null;
  calendlyInviteeUri?: string | null;
  status: DemoRequestStatus;
  source: 'CALENDLY' | 'MANUAL';
  adminNote?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedByName?: string | null;
}

export interface PlatformMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  trialBusinesses: number;
  totalPlatformUsers: number;
  totalOrders: number;
  totalCustomers: number;
}

export interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  platformUser: { id: string; name: string; email: string; role: string };
}

export interface PublicTable {
  id: string;
  tableIdentifier: string;
  capacity: number;
  status: string;
}

export interface QrPayload {
  type: 'counter' | 'table';
  url: string;
  businessSlug: string;
  tableIdentifier?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  customerContact?: string | null;
  partySize: number;
  reservationTime: string;
  status: string;
  notes?: string | null;
  tableId?: string | null;
}

export interface Promotion {
  id: string;
  title: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string | number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SubscriptionPlan {
  interval: 'MONTHLY' | 'YEARLY';
  price: number;
  currency: string;
}

export interface SubscriptionInvoiceAlert {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  billingInterval?: string | null;
  dueAt: string;
  alertEndsAt: string;
  sentAt: string;
  note?: string | null;
  pdfUrl: string;
  kind?: 'PAYMENT_REQUEST' | 'PURCHASE_RECEIPT';
  status?: 'OPEN' | 'PAID' | 'CANCELLED';
  periodEndsAt?: string | null;
  daysUntilDue: number;
  alertDaysRemaining: number;
}

export type SubscriptionAccessPhase =
  | 'active'
  | 'trial'
  | 'grace'
  | 'read_only'
  | 'locked'
  | 'pending_verification'
  | 'suspended';

export interface TenantSubscription {
  businessId: string;
  status: string;
  subscriptionStatus: string;
  billingInterval?: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  periodEndsAt?: string | null;
  daysRemaining?: number | null;
  expiryWarning?: boolean;
  expiryReminderDays?: 7 | 3 | 1 | null;
  accessPhase?: SubscriptionAccessPhase;
  isLocked: boolean;
  isReadOnly?: boolean;
  isSubscriptionBlocked?: boolean;
  hasPendingPayment: boolean;
  tempAccessUntil?: string | null;
  effectiveMonthlyPrice?: number;
  customMonthlyPrice?: number | null;
  durationPlans?: Array<{ durationMonths: number; price: number; currency: string }>;
  subscriptionInvoice?: SubscriptionInvoiceAlert | null;
  purchaseReceipt?: SubscriptionInvoiceAlert | null;
  latestPurchaseReceipt?: SubscriptionInvoiceAlert | null;
  plans: {
    monthly: SubscriptionPlan;
    yearly: SubscriptionPlan;
  };
}

export interface PaymentInstructions {
  defaultTrialDays: number;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  bankName?: string | null;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  swiftCode?: string | null;
  paymentInstructions?: string | null;
  plans: {
    monthly: SubscriptionPlan;
    yearly: SubscriptionPlan;
  };
}

export type InboxNotificationCategory =
  | 'ORDER'
  | 'KITCHEN'
  | 'RESERVATION'
  | 'BILLING'
  | 'INVENTORY'
  | 'DELIVERY'
  | 'SYSTEM'
  | 'PROMOTION';

export interface InboxNotification {
  id: string;
  businessId: string;
  userId: string;
  category: InboxNotificationCategory;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionHref?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationPreferences {
  browserEnabled: boolean;
  browserCategories: InboxNotificationCategory[] | null;
}

export interface PaymentSubmission {
  id: string;
  businessId: string;
  interval: 'MONTHLY' | 'YEARLY';
  durationMonths?: number | null;
  amount: string | number;
  expectedAmount?: number | null;
  transactionReference?: string | null;
  proofImageUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
  tempAccessGranted?: boolean;
  tempAccessUntil?: string | null;
  tempAccessSkipped?: boolean;
  createdAt: string;
  reviewedAt?: string | null;
  business?: { id: string; name: string; slug: string };
}

export interface PlatformBillingSettings {
  defaultTrialDays: number;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  gracePeriodDays?: number;
  readOnlyPeriodDays?: number;
  bankName?: string | null;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  swiftCode?: string | null;
  paymentInstructions?: string | null;
}

export interface CashDrawerMovement {
  id: string;
  type: 'OPENING' | 'SALE' | 'REFUND' | 'PAY_IN' | 'PAY_OUT' | 'CLOSING';
  amount: string | number;
  reason?: string | null;
  orderId?: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface CashShiftStats {
  cashSales: number;
  cashRefunds: number;
  payIn: number;
  payOut: number;
  expectedCash: number;
}

export type CashClosingSettlement =
  | 'KEEP_IN_DRAWER'
  | 'HANDOVER_TO_OWNER'
  | 'TRANSFER_TO_WALLET'
  | 'TRANSFER_TO_BANK'
  | 'OTHER';

export interface CashSettlementAccount {
  id: string;
  name: string;
  accountType: 'DRAWER' | 'OWNER' | 'WALLET' | 'BANK' | 'OTHER';
}

export interface CashShift {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: string | number;
  expectedCash?: string | number | null;
  actualCash?: string | number | null;
  variance?: string | number | null;
  notes?: string | null;
  closingSettlement?: CashClosingSettlement | null;
  transferredCash?: string | number | null;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  openedAt: string;
  closedAt?: string | null;
  openedById: string;
  openedByName: string;
  closedById?: string | null;
  closedByName?: string | null;
  movements?: CashDrawerMovement[];
  stats?: CashShiftStats;
}

export interface CashShiftSummary {
  shift: CashShift;
  summary: {
    openingCash: number;
    cashSales: number;
    cashRefunds: number;
    payIn: number;
    payOut: number;
    expectedCash: number;
  };
}

export interface RiderCashSettlement {
  id: string;
  orderId: string;
  riderId: string;
  riderName: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED';
  cashShiftId?: string | null;
  confirmedById?: string | null;
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  orderLabel: string;
  customerName?: string | null;
  orderTotal: number;
}

export interface RiderPendingCash {
  totalPending: number;
  settlements: RiderCashSettlement[];
}

export interface RiderCashHandoffGroup {
  riderId: string;
  riderName: string;
  totalPending: number;
  settlements: RiderCashSettlement[];
}

export type FeedbackTicketType = 'FEEDBACK' | 'BUG_REPORT';
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type FeedbackTicketStatus = 'OPEN' | 'RESOLVED' | 'REJECTED';

export interface FeedbackContactSettings {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  websiteUrl?: string | null;
  supportHours?: string | null;
  extraNote?: string | null;
}

export interface FeedbackTicket {
  id: string;
  businessId: string;
  createdById: string;
  type: FeedbackTicketType;
  priority: FeedbackPriority;
  subject?: string | null;
  message: string;
  imageKey?: string | null;
  imageUrl?: string | null;
  status: FeedbackTicketStatus;
  adminNote?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  businessName?: string | null;
  businessSlug?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  reviewedByName?: string | null;
}
