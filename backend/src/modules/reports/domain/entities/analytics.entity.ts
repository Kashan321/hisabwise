import type { ReportFilters } from '../../infrastructure/persistence/report-query-builder';

export type { ReportFilters };

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

export interface SalesReport {
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

export interface CustomerReportRow {
  customerId: string;
  name: string;
  orderCount: number;
  totalSpent: string;
  averageOrderValue: string;
  loyaltyPoints: number;
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

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CsvExportResult {
  csv: string;
  filename: string;
}
