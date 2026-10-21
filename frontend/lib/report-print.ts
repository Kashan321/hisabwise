import { APP_NAME } from '@/lib/config';
import type {
  CustomerReportSummary,
  DeliveryReportRow,
  EmployeeReportRow,
  InventoryReportRow,
  ModifierPerformanceRow,
  OrderReportRow,
  OrderTypeReportRow,
  PaymentReportRow,
  ProductPerformanceRow,
  ProfitReportRow,
  ProfitReportSummary,
  PromotionReportRow,
  PurchaseReportRow,
  ReportsDashboard,
  SalesReportDetail,
  TableReportRow,
  TipsReport,
  VariantPerformanceRow,
  WastageReportRow,
} from '@/lib/api/types';
import { paymentMethodLabel } from '@/lib/payment-methods';
import {
  printThermalDocument,
  type ThermalDocumentOptions,
  type ThermalStatRow,
  type ThermalTableSection,
} from '@/lib/print-thermal-document';

const MAX_ROWS = 45;

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine-in',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  QR: 'QR',
};

function truncateRows<T>(rows: T[]): { visible: T[]; truncatedCount?: number } {
  if (rows.length <= MAX_ROWS) return { visible: rows };
  return { visible: rows.slice(0, MAX_ROWS), truncatedCount: rows.length - MAX_ROWS };
}

function tableSection(
  heading: string,
  headers: [string, string],
  rows: string[][],
  truncatedCount?: number,
): ThermalTableSection {
  return { heading, headers, rows, truncatedCount };
}

export interface ReportPrintInput {
  reportId: string;
  title: string;
  rangeLabel: string;
  businessName?: string;
  businessLocation?: string | null;
  widthMm?: 58 | 80;
  formatMoney: (value: string | number) => string;
  sales?: SalesReportDetail;
  products?: ProductPerformanceRow[];
  profit?: { summary: ProfitReportSummary; rows: ProfitReportRow[] };
  variants?: VariantPerformanceRow[];
  modifiers?: ModifierPerformanceRow[];
  payments?: PaymentReportRow[];
  employees?: EmployeeReportRow[];
  inventory?: InventoryReportRow[];
  purchases?: PurchaseReportRow[];
  wastage?: WastageReportRow[];
  orders?: OrderReportRow[];
  orderTypes?: OrderTypeReportRow[];
  tables?: TableReportRow[];
  delivery?: DeliveryReportRow[];
  customers?: CustomerReportSummary;
  tips?: TipsReport;
  promotions?: PromotionReportRow[];
  dashboard?: ReportsDashboard;
}

function buildStatsAndTables(input: ReportPrintInput): {
  stats?: ThermalStatRow[];
  tables: ThermalTableSection[];
} {
  const { formatMoney: money, reportId } = input;
  const tables: ThermalTableSection[] = [];

  switch (reportId) {
    case 'overview': {
      const d = input.dashboard;
      if (!d) return { tables };
      return {
        stats: [
          { label: 'Gross sales', value: money(d.grossSales) },
          { label: 'Net sales', value: money(d.netSales) },
          { label: 'Total orders', value: String(d.totalOrders) },
          { label: 'Avg order', value: money(d.averageOrderValue) },
          { label: 'Discounts', value: money(d.totalDiscounts) },
          { label: 'Tax', value: money(d.totalTax) },
          { label: 'Service charges', value: money(d.totalServiceCharges) },
          { label: 'Purchases', value: money(d.totalPurchases) },
          { label: 'Wastage value', value: money(d.wastageValue) },
        ],
        tables,
      };
    }

    case 'sales': {
      const s = input.sales;
      if (!s) return { tables };
      return {
        stats: [
          { label: 'Gross sales', value: money(s.grossSales) },
          { label: 'Net sales', value: money(s.netSales) },
          { label: 'Orders', value: String(s.orderCount) },
          { label: 'Avg order', value: money(s.averageOrderValue) },
          { label: 'Discounts', value: money(s.discounts) },
          { label: 'Tax', value: money(s.taxes) },
          { label: 'Service', value: money(s.serviceCharges) },
          { label: 'Refunds', value: money(s.refunds) },
        ],
        tables: s.trend.length
          ? [
              tableSection(
                'Sales trend',
                ['Date', 'Revenue'],
                s.trend.map((t) => [t.bucket, money(t.revenue)]),
              ),
            ]
          : tables,
      };
    }

    case 'products': {
      const { visible, truncatedCount } = truncateRows(input.products ?? []);
      tables.push(
        tableSection(
          'Products',
          ['Product', 'Qty / Revenue'],
          visible.map((p) => [p.name, `${p.quantitySold} · ${money(p.revenue)}`]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'profit': {
      const summary = input.profit?.summary;
      const { visible, truncatedCount } = truncateRows(input.profit?.rows ?? []);
      return {
        stats: summary
          ? [
              { label: 'Revenue', value: money(summary.revenue) },
              { label: 'Estimated cost', value: money(summary.estimatedCost) },
              { label: 'Estimated profit', value: money(summary.estimatedProfit) },
              {
                label: 'Estimated margin',
                value: summary.estimatedMarginPercent ? `${summary.estimatedMarginPercent}%` : '—',
              },
              { label: 'Qty sold (with base price)', value: String(summary.quantitySold) },
            ]
          : undefined,
        tables: [
          tableSection(
            'Estimated profit by product',
            ['Product', 'Est. profit'],
            visible.map((row) => [row.name, money(row.estimatedProfit)]),
            truncatedCount,
          ),
        ],
      };
    }

    case 'variants': {
      const { visible, truncatedCount } = truncateRows(input.variants ?? []);
      tables.push(
        tableSection(
          'Variants',
          ['Variant', 'Qty / Revenue'],
          visible.map((v) => [`${v.variantName} (${v.parentProductName})`, `${v.quantitySold} · ${money(v.revenue)}`]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'modifiers': {
      const { visible, truncatedCount } = truncateRows(input.modifiers ?? []);
      tables.push(
        tableSection(
          'Modifiers',
          ['Modifier', 'Uses / Revenue'],
          visible.map((m) => [m.modifierName, `${m.timesSelected} · ${money(m.additionalRevenue)}`]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'payments': {
      const { visible, truncatedCount } = truncateRows(input.payments ?? []);
      tables.push(
        tableSection(
          'Payment methods',
          ['Method', 'Count / Total'],
          visible.map((p) => [
            paymentMethodLabel(p.method),
            `${p.transactionCount} · ${money(p.totalAmount)}`,
          ]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'employees': {
      const { visible, truncatedCount } = truncateRows(input.employees ?? []);
      tables.push(
        tableSection(
          'Employees',
          ['Name', 'Orders / Sales'],
          visible.map((e) => [e.employeeName, `${e.ordersProcessed} · ${money(e.salesTotal)}`]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'inventory': {
      const { visible, truncatedCount } = truncateRows(input.inventory ?? []);
      tables.push(
        tableSection(
          'Inventory status',
          ['Item', 'Stock / Status'],
          visible.map((r) => [
            r.itemName,
            `Now ${r.currentStock} ${r.unit} · ${r.stockStatus}`,
          ]),
          truncatedCount,
        ),
      );
      if (visible.length) {
        tables.push(
          tableSection(
            'Movements',
            ['Item', 'Open / Purch / Use'],
            visible.map((r) => [
              r.itemName,
              `${r.opening} / ${r.purchased} / ${r.salesConsumption}`,
            ]),
          ),
        );
      }
      break;
    }

    case 'purchases': {
      const { visible, truncatedCount } = truncateRows(input.purchases ?? []);
      tables.push(
        tableSection(
          'Purchases',
          ['Item', 'Qty / Cost'],
          visible.map((p) => [
            `${p.itemName} (${new Date(p.purchasedAt).toLocaleDateString()})`,
            `${p.quantity} ${p.unit} · ${p.totalCost ? money(p.totalCost) : '—'}`,
          ]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'wastage': {
      const { visible, truncatedCount } = truncateRows(input.wastage ?? []);
      tables.push(
        tableSection(
          'Wastage',
          ['Item', 'Qty / Value'],
          visible.map((w) => [
            `${w.itemName} (${new Date(w.createdAt).toLocaleDateString()})`,
            `${w.quantity} ${w.unit} · ${w.estimatedValue ? money(w.estimatedValue) : '—'}`,
          ]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'orders': {
      const { visible, truncatedCount } = truncateRows(input.orders ?? []);
      tables.push(
        tableSection(
          'Orders',
          ['Ticket', 'Total / Type'],
          visible.map((o) => [
            o.ticketNumber ?? o.id.slice(0, 8),
            `${money(o.totalAmount)} · ${ORDER_TYPE_LABELS[o.orderType] ?? o.orderType}`,
          ]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'order-types': {
      const { visible, truncatedCount } = truncateRows(input.orderTypes ?? []);
      tables.push(
        tableSection(
          'Order types',
          ['Type', 'Orders / Revenue'],
          visible.map((o) => [
            ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
            `${o.orderCount} · ${money(o.revenue)}`,
          ]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'tables': {
      const { visible, truncatedCount } = truncateRows(input.tables ?? []);
      tables.push(
        tableSection(
          'Tables',
          ['Table', 'Orders / Revenue'],
          visible.map((t) => [t.tableIdentifier, `${t.orderCount} · ${money(t.revenue)}`]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'delivery': {
      const { visible, truncatedCount } = truncateRows(input.delivery ?? []);
      tables.push(
        tableSection(
          'Riders',
          ['Rider', 'Done / Sales'],
          visible.map((d) => [
            d.riderName,
            `${d.completed}/${d.assigned} · ${money(d.deliverySales)}`,
          ]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'customers': {
      const c = input.customers;
      if (!c) return { tables };
      const { visible, truncatedCount } = truncateRows(c.topCustomers ?? []);
      return {
        stats: [
          { label: 'Customers', value: String(c.totalCustomers) },
          { label: 'Orders', value: String(c.totalOrders) },
          { label: 'Total spending', value: money(c.totalSpending) },
          { label: 'Avg order', value: money(c.averageOrderValue) },
        ],
        tables: [
          tableSection(
            'Top customers',
            ['Customer', 'Orders / Spent'],
            visible.map((row) => [row.name, `${row.orderCount} · ${money(row.totalSpent)}`]),
            truncatedCount,
          ),
        ],
      };
    }

    case 'tips': {
      const t = input.tips;
      if (!t) return { tables };
      if (!t.tipsAvailable) {
        return {
          stats: [{ label: 'Tips', value: t.note ?? 'Not tracked' }],
          tables,
        };
      }
      const employees = t.byEmployee ?? [];
      const { visible, truncatedCount } = truncateRows(employees);
      tables.push(
        tableSection(
          'Tips by employee',
          ['Employee', 'Tips'],
          visible.map((e) => [e.employeeName, money(e.tips)]),
          truncatedCount,
        ),
      );
      break;
    }

    case 'promotions': {
      const { visible, truncatedCount } = truncateRows(input.promotions ?? []);
      tables.push(
        tableSection(
          'Promotions',
          ['Promotion', 'Uses / Discount'],
          visible.map((p) => [p.title, `${p.useCount} · ${money(p.totalDiscount)}`]),
          truncatedCount,
        ),
      );
      break;
    }

    default:
      break;
  }

  return { tables };
}

export function hasReportPrintData(input: ReportPrintInput): boolean {
  const { stats, tables } = buildStatsAndTables(input);
  return Boolean((stats && stats.length > 0) || tables.some((t) => t.rows.length > 0));
}

export function printReport(input: ReportPrintInput): void {
  const { stats, tables } = buildStatsAndTables(input);
  const options: ThermalDocumentOptions = {
    title: input.title,
    rangeLabel: input.rangeLabel,
    businessName: input.businessName,
    businessLocation: input.businessLocation,
    widthMm: input.widthMm ?? 80,
    stats,
    tables: tables.filter((t) => t.rows.length > 0),
    footerLines: [`${APP_NAME} · Report`],
  };

  if (!hasReportPrintData(input)) {
    throw new Error('No report data to print for this date range.');
  }

  printThermalDocument(options);
}
