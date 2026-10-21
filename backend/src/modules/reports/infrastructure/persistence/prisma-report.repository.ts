import { OrderSource, Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  DailyRevenueItem,
  ExportInvoicesResult,
  InvoiceRecord,
  ListInvoicesFilters,
  ListInvoicesResult,
  PaymentBreakdownItem,
  ReportDateRange,
  SalesSummary,
} from '../../domain/entities/report.entity';
import { ReportRepository } from '../../domain/repositories/report.repository';
import { enrichReportFilters } from './report-business-day-filter';
import { buildCompletedOrderWhere } from './report-query-builder';
import { formatDateKey, resolveReportDateRange } from './report-date-range';

function decimalToString(value: Prisma.Decimal | null | undefined): string {
  if (!value) return '0.00';
  return value.toFixed(2);
}

async function completedOrdersWhere(businessId: string, range: ReportDateRange) {
  const filters = await enrichReportFilters(businessId, range);
  return buildCompletedOrderWhere(businessId, filters);
}

function invoiceNumber(orderId: string): string {
  return `INV-${orderId.slice(0, 8).toUpperCase()}`;
}

function mapInvoice(order: {
  id: string;
  createdAt: Date;
  source: OrderSource;
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'ONLINE' | 'OTHER' | null;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  serviceAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  table: { tableIdentifier: string } | null;
  _count: { items: number };
}): InvoiceRecord {
  return {
    id: order.id,
    invoiceNumber: invoiceNumber(order.id),
    createdAt: order.createdAt.toISOString(),
    tableIdentifier: order.table?.tableIdentifier ?? null,
    source: order.source,
    paymentMethod: order.paymentMethod,
    subtotal: decimalToString(order.subtotal),
    discountAmount: decimalToString(order.discountAmount),
    taxAmount: decimalToString(order.taxAmount),
    serviceAmount: decimalToString(order.serviceAmount),
    totalAmount: decimalToString(order.totalAmount),
    itemCount: order._count.items,
  };
}

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class PrismaReportRepository implements ReportRepository {
  async getSalesSummary(businessId: string, range: ReportDateRange): Promise<SalesSummary> {
    const filters = await enrichReportFilters(businessId, range);
    const where = buildCompletedOrderWhere(businessId, filters);
    const cancelledWhere = buildCompletedOrderWhere(businessId, {
      ...filters,
      status: 'CANCELLED',
    });

    const [aggregate, cancelledCount] = await Promise.all([
      prisma.order.aggregate({
        where,
        _sum: {
          totalAmount: true,
          discountAmount: true,
          taxAmount: true,
          serviceAmount: true,
        },
        _count: true,
      }),
      prisma.order.count({
        where: cancelledWhere,
      }),
    ]);

    const orderCount = aggregate._count;
    const totalRevenue = decimalToString(aggregate._sum.totalAmount);
    const averageTicket =
      orderCount > 0
        ? (Number(totalRevenue) / orderCount).toFixed(2)
        : '0.00';

    return {
      totalRevenue,
      orderCount,
      averageTicket,
      totalDiscount: decimalToString(aggregate._sum.discountAmount),
      totalTax: decimalToString(aggregate._sum.taxAmount),
      totalService: decimalToString(aggregate._sum.serviceAmount),
      cancelledCount,
    };
  }

  async getPaymentBreakdown(
    businessId: string,
    range: ReportDateRange,
  ): Promise<PaymentBreakdownItem[]> {
    const where = await completedOrdersWhere(businessId, range);
    const groups = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { totalAmount: true },
      _count: true,
    });

    return groups
      .filter((group) => group.paymentMethod)
      .map((group) => ({
        paymentMethod: group.paymentMethod!,
        orderCount: group._count,
        totalAmount: decimalToString(group._sum.totalAmount),
      }))
      .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
  }

  async getDailyRevenue(businessId: string, range: ReportDateRange): Promise<DailyRevenueItem[]> {
    const { from, to } = resolveReportDateRange(range);

    const orders = await prisma.order.findMany({
      where: await completedOrdersWhere(businessId, range),
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDate = new Map<string, { orderCount: number; totalAmount: number }>();

    for (const order of orders) {
      const key = formatDateKey(order.createdAt);
      const existing = byDate.get(key) ?? { orderCount: 0, totalAmount: 0 };
      existing.orderCount += 1;
      existing.totalAmount += Number(order.totalAmount);
      byDate.set(key, existing);
    }

    const items: DailyRevenueItem[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= end.getTime()) {
      const key = formatDateKey(cursor);
      const bucket = byDate.get(key);
      items.push({
        date: key,
        orderCount: bucket?.orderCount ?? 0,
        totalAmount: (bucket?.totalAmount ?? 0).toFixed(2),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return items;
  }

  async listInvoices(
    businessId: string,
    filters: ListInvoicesFilters,
  ): Promise<ListInvoicesResult> {
    const { from, to } = resolveReportDateRange(filters);
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      businessId,
      status: 'COMPLETED',
      createdAt: { gte: from, lte: to },
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod as never } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          table: { select: { tableIdentifier: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      invoices: orders.map(mapInvoice),
      total,
    };
  }

  async exportInvoices(
    businessId: string,
    range: ReportDateRange,
  ): Promise<ExportInvoicesResult> {
    const { from, to } = resolveReportDateRange(range);
    const where = await completedOrdersWhere(businessId, range);
    const orders = await prisma.order.findMany({
      where,
      include: {
        table: { select: { tableIdentifier: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Invoice #',
      'Date',
      'Table',
      'Source',
      'Payment',
      'Subtotal',
      'Discount',
      'Tax',
      'Service',
      'Total',
      'Items',
    ];

    const rows = orders.map((order) => {
      const invoice = mapInvoice(order);
      return [
        invoice.invoiceNumber,
        new Date(invoice.createdAt).toLocaleString(),
        invoice.tableIdentifier ?? '',
        invoice.source,
        invoice.paymentMethod ?? '',
        invoice.subtotal,
        invoice.discountAmount,
        invoice.taxAmount,
        invoice.serviceAmount,
        invoice.totalAmount,
        invoice.itemCount,
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const fromKey = formatDateKey(from);
    const toKey = formatDateKey(to);

    return {
      csv,
      filename: `invoices-${fromKey}-to-${toKey}.csv`,
    };
  }
}
