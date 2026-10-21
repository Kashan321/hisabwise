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

export interface ListInvoicesFilters extends ReportDateRange {
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

export interface ListInvoicesResult {
  invoices: InvoiceRecord[];
  total: number;
}

export interface ExportInvoicesResult {
  csv: string;
  filename: string;
}
