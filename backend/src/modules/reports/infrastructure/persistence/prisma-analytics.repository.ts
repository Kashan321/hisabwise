import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import { formatOrderTicketLabel } from '../../../orders/application/services/order-ticket.service';
import type {
  CustomerReportRow,
  DeliveryReportRow,
  EmployeeReportRow,
  InventoryReportRow,
  ModifierPerformanceRow,
  OrderReportRow,
  OrderTypeReportRow,
  PaginatedResult,
  PaymentReportRow,
  ProductPerformanceRow,
  ProfitReportRow,
  ProfitReportSummary,
  PromotionReportRow,
  PurchaseReportRow,
  ReportsDashboard,
  SalesReport,
  TableReportRow,
  VariantPerformanceRow,
  WastageReportRow,
} from '../../domain/entities/analytics.entity';
import {
  buildCompletedOrderWhere,
  buildOrderItemWhere,
  type ReportFilters,
} from './report-query-builder';
import {
  formatDateKey,
  resolveReportDateRange,
  resolveSalesTrendGranularity,
  salesTrendBucketKey,
} from './report-date-range';

function dec(value: Prisma.Decimal | null | undefined): number {
  return value ? Number(value) : 0;
}

function decStr(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function stockStatus(current: number, min: number | null): string {
  if (current <= 0) return 'out_of_stock';
  if (min != null && current <= min) return 'low_stock';
  return 'in_stock';
}

export class PrismaAnalyticsRepository {
  private buildInventoryDateWhere(
    businessId: string,
    filters: ReportFilters,
    field: 'purchasedAt' | 'createdAt',
  ) {
    const { from, to } = resolveReportDateRange(filters);
    if (filters.businessDayIds?.length) {
      return {
        businessId,
        OR: [
          { businessDayId: { in: filters.businessDayIds } },
          { businessDayId: null, [field]: { gte: from, lte: to } },
        ],
      };
    }
    return { businessId, [field]: { gte: from, lte: to } };
  }

  private async orderAggregates(businessId: string, filters: ReportFilters) {
    const where = buildCompletedOrderWhere(businessId, filters);
    const { from, to } = resolveReportDateRange(filters);
    const cancelledWhere = filters.businessDayIds?.length
      ? {
          businessId,
          status: 'CANCELLED' as const,
          OR: [
            { businessDayId: { in: filters.businessDayIds } },
            { businessDayId: null, createdAt: { gte: from, lte: to } },
          ],
        }
      : {
          businessId,
          status: 'CANCELLED' as const,
          createdAt: { gte: from, lte: to },
        };

    const [agg, cancelledCount, refundAgg] = await Promise.all([
      prisma.order.aggregate({
        where,
        _sum: {
          subtotal: true,
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
      prisma.cashDrawerMovement.aggregate({
        where: {
          businessId,
          type: 'REFUND',
          createdAt: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
    ]);

    const orderCount = agg._count;
    const grossSales = dec(agg._sum.subtotal);
    const discounts = dec(agg._sum.discountAmount);
    const taxes = dec(agg._sum.taxAmount);
    const service = dec(agg._sum.serviceAmount);
    const totalAmount = dec(agg._sum.totalAmount);
    const refunds = dec(refundAgg._sum.amount);

    return {
      orderCount,
      grossSales,
      discounts,
      taxes,
      service,
      totalAmount,
      netSales: totalAmount - refunds,
      refunds,
      refundsAvailable: refunds > 0,
      cancelledCount,
      averageOrderValue: orderCount > 0 ? totalAmount / orderCount : 0,
    };
  }

  async getDashboard(businessId: string, filters: ReportFilters): Promise<ReportsDashboard> {
    const o = await this.orderAggregates(businessId, filters);

    const [purchaseAgg, wastageMovements] = await Promise.all([
      prisma.inventoryPurchase.aggregate({
        where: this.buildInventoryDateWhere(businessId, filters, 'purchasedAt'),
        _sum: { totalCost: true },
      }),
      prisma.inventoryMovement.findMany({
        where: {
          ...this.buildInventoryDateWhere(businessId, filters, 'createdAt'),
          type: 'WASTE',
        },
        select: { quantityDelta: true, unitCost: true },
      }),
    ]);

    let wastageValue = 0;
    for (const m of wastageMovements) {
      const qty = Math.abs(dec(m.quantityDelta));
      wastageValue += qty * (m.unitCost ? dec(m.unitCost) : 0);
    }

    return {
      grossSales: decStr(o.grossSales),
      netSales: decStr(o.netSales),
      totalOrders: o.orderCount,
      averageOrderValue: decStr(o.averageOrderValue),
      totalDiscounts: decStr(o.discounts),
      totalTax: decStr(o.taxes),
      totalServiceCharges: decStr(o.service),
      totalTips: '0.00',
      tipsAvailable: false,
      refunds: decStr(o.refunds),
      refundsAvailable: o.refundsAvailable,
      totalPurchases: decStr(dec(purchaseAgg._sum.totalCost)),
      wastageValue: decStr(wastageValue),
      cancelledOrders: o.cancelledCount,
    };
  }

  async getSalesReport(businessId: string, filters: ReportFilters): Promise<SalesReport> {
    const o = await this.orderAggregates(businessId, filters);
    const { from, to } = resolveReportDateRange(filters);
    const granularity = resolveSalesTrendGranularity(from, to, filters.from, filters.to);

    const orders = await prisma.order.findMany({
      where: buildCompletedOrderWhere(businessId, filters),
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, { orderCount: number; revenue: number }>();
    for (const order of orders) {
      const d = order.createdAt;
      const bucket = salesTrendBucketKey(d, granularity);
      const b = buckets.get(bucket) ?? { orderCount: 0, revenue: 0 };
      b.orderCount += 1;
      b.revenue += dec(order.totalAmount);
      buckets.set(bucket, b);
    }

    const trend = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, data]) => ({
        bucket,
        orderCount: data.orderCount,
        revenue: decStr(data.revenue),
      }));

    return {
      grossSales: decStr(o.grossSales),
      subtotal: decStr(o.grossSales),
      discounts: decStr(o.discounts),
      taxes: decStr(o.taxes),
      serviceCharges: decStr(o.service),
      tips: '0.00',
      tipsAvailable: false,
      refunds: decStr(o.refunds),
      refundsAvailable: o.refundsAvailable,
      netSales: decStr(o.netSales),
      orderCount: o.orderCount,
      averageOrderValue: decStr(o.averageOrderValue),
      trend,
      formulas: {
        grossSales: 'Sum of order subtotals for completed orders',
        netSales: 'Sum of order totals minus cash drawer refunds in range',
        discounts: 'Sum of discounts on completed orders',
        taxes: 'Sum of taxAmount on completed orders',
        serviceCharges: 'Sum of serviceAmount (service charge, not tips)',
        refunds: 'Sum of cash drawer REFUND movements in date range',
      },
    };
  }

  async getProductReport(
    businessId: string,
    filters: ReportFilters,
    sort: 'quantity' | 'revenue' = 'quantity',
    limit = 50,
  ): Promise<ProductPerformanceRow[]> {
    const items = await prisma.orderItem.findMany({
      where: buildOrderItemWhere(businessId, filters),
      select: {
        menuItemId: true,
        menuItemName: true,
        quantity: true,
        unitPrice: true,
        orderId: true,
        menuItem: { select: { category: { select: { name: true } } } },
      },
    });

    const map = new Map<
      string,
      {
        name: string;
        categoryName: string | null;
        quantity: number;
        revenue: number;
        orders: Set<string>;
      }
    >();

    for (const item of items) {
      if (!item.menuItemId) continue;
      const key = item.menuItemId;
      const row = map.get(key) ?? {
        name: item.menuItemName,
        categoryName: item.menuItem?.category?.name ?? null,
        quantity: 0,
        revenue: 0,
        orders: new Set<string>(),
      };
      row.quantity += item.quantity;
      row.revenue += dec(item.unitPrice) * item.quantity;
      row.orders.add(item.orderId);
      map.set(key, row);
    }

    const rows = [...map.entries()].map(([menuItemId, r]) => ({
      menuItemId,
      name: r.name,
      categoryName: r.categoryName,
      quantitySold: r.quantity,
      revenue: decStr(r.revenue),
      averageSellingPrice: decStr(r.quantity > 0 ? r.revenue / r.quantity : 0),
      orderCount: r.orders.size,
    }));

    rows.sort((a, b) =>
      sort === 'revenue'
        ? Number(b.revenue) - Number(a.revenue)
        : b.quantitySold - a.quantitySold,
    );
    return rows.slice(0, limit);
  }

  async getProfitReport(
    businessId: string,
    filters: ReportFilters,
    limit = 100,
  ): Promise<{ summary: ProfitReportSummary; rows: ProfitReportRow[] }> {
    const items = await prisma.orderItem.findMany({
      where: buildOrderItemWhere(businessId, filters),
      select: {
        menuItemId: true,
        menuItemName: true,
        variantId: true,
        variantName: true,
        quantity: true,
        lineTotal: true,
        menuItem: {
          select: {
            basePrice: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const variantIds = [
      ...new Set(items.map((item) => item.variantId).filter((id): id is string => Boolean(id))),
    ];
    const variants = variantIds.length
      ? await prisma.menuItemVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, basePrice: true },
        })
      : [];
    const variantCostById = new Map(
      variants.map((variant) => [
        variant.id,
        variant.basePrice != null ? dec(variant.basePrice) : null,
      ]),
    );

    const map = new Map<
      string,
      {
        menuItemId: string | null;
        variantId: string | null;
        name: string;
        categoryName: string | null;
        quantitySold: number;
        revenue: number;
        estimatedCost: number;
      }
    >();

    let totalRevenue = 0;
    let totalCost = 0;
    let quantitySold = 0;
    let quantityWithCost = 0;
    let quantityMissingCost = 0;

    for (const item of items) {
      const unitCost =
        item.variantId != null
          ? variantCostById.get(item.variantId) ?? null
          : item.menuItem?.basePrice != null
            ? dec(item.menuItem.basePrice)
            : null;

      if (unitCost == null) {
        quantityMissingCost += item.quantity;
        continue;
      }

      const revenue = dec(item.lineTotal);
      const lineCost = unitCost * item.quantity;
      totalRevenue += revenue;
      totalCost += lineCost;
      quantitySold += item.quantity;
      quantityWithCost += item.quantity;

      const rowKey = item.variantId
        ? `variant:${item.variantId}`
        : `item:${item.menuItemId ?? item.menuItemName}`;
      const name =
        item.variantId && item.variantName
          ? `${item.menuItemName} · ${item.variantName}`
          : item.menuItemName;
      const categoryName = item.menuItem?.category?.name ?? null;

      const existing = map.get(rowKey);
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += revenue;
        existing.estimatedCost += lineCost;
      } else {
        map.set(rowKey, {
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          name,
          categoryName,
          quantitySold: item.quantity,
          revenue,
          estimatedCost: lineCost,
        });
      }
    }

    const estimatedProfit = totalRevenue - totalCost;
    const summaryMargin =
      totalRevenue > 0 ? Math.round((estimatedProfit / totalRevenue) * 1000) / 10 : null;

    const rows = [...map.values()]
      .filter((row) => row.estimatedCost > 0)
      .map((row) => {
        const profit = row.revenue - row.estimatedCost;
        const margin =
          row.revenue > 0 ? Math.round((profit / row.revenue) * 1000) / 10 : null;
        return {
          rowKey: row.variantId ? `variant:${row.variantId}` : `item:${row.menuItemId ?? row.name}`,
          menuItemId: row.menuItemId,
          variantId: row.variantId,
          name: row.name,
          categoryName: row.categoryName,
          quantitySold: row.quantitySold,
          revenue: decStr(row.revenue),
          estimatedCost: decStr(row.estimatedCost),
          estimatedProfit: decStr(profit),
          estimatedMarginPercent: margin != null ? String(margin) : null,
        };
      })
      .sort((a, b) => Number(b.estimatedProfit) - Number(a.estimatedProfit))
      .slice(0, limit);

    return {
      summary: {
        revenue: decStr(totalRevenue),
        estimatedCost: decStr(totalCost),
        estimatedProfit: decStr(estimatedProfit),
        estimatedMarginPercent: summaryMargin != null ? String(summaryMargin) : null,
        quantitySold,
        quantityWithCost,
        quantityMissingCost,
      },
      rows,
    };
  }

  async getVariantReport(businessId: string, filters: ReportFilters): Promise<VariantPerformanceRow[]> {
    const items = await prisma.orderItem.findMany({
      where: {
        ...buildOrderItemWhere(businessId, filters),
        variantId: { not: null },
      },
      select: {
        variantId: true,
        variantName: true,
        menuItemName: true,
        quantity: true,
        unitPrice: true,
      },
    });

    const map = new Map<string, { row: VariantPerformanceRow; qty: number; rev: number }>();
    for (const item of items) {
      if (!item.variantId) continue;
      const existing = map.get(item.variantId);
      const rev = dec(item.unitPrice) * item.quantity;
      if (existing) {
        existing.qty += item.quantity;
        existing.rev += rev;
        existing.row.quantitySold = existing.qty;
        existing.row.revenue = decStr(existing.rev);
      } else {
        map.set(item.variantId, {
          qty: item.quantity,
          rev,
          row: {
            variantId: item.variantId,
            variantName: item.variantName ?? 'Variant',
            parentProductName: item.menuItemName,
            quantitySold: item.quantity,
            revenue: decStr(rev),
          },
        });
      }
    }

    return [...map.values()]
      .map((v) => v.row)
      .sort((a, b) => b.quantitySold - a.quantitySold);
  }

  async getModifierReport(businessId: string, filters: ReportFilters): Promise<ModifierPerformanceRow[]> {
    const modifiers = await prisma.orderItemModifier.findMany({
      where: {
        orderItem: buildOrderItemWhere(businessId, filters),
      },
      select: {
        modifierOptionId: true,
        modifierName: true,
        priceAdjustment: true,
        orderItem: {
          select: { menuItemName: true, quantity: true },
        },
      },
    });

    const map = new Map<string, { row: ModifierPerformanceRow; rev: number }>();
    for (const m of modifiers) {
      const key = m.modifierOptionId ?? m.modifierName;
      const qty = m.orderItem.quantity;
      const addRev = dec(m.priceAdjustment) * qty;
      const existing = map.get(key);
      if (existing) {
        existing.row.timesSelected += qty;
        existing.rev += addRev;
        existing.row.additionalRevenue = decStr(existing.rev);
      } else {
        map.set(key, {
          rev: addRev,
          row: {
            modifierOptionId: m.modifierOptionId,
            modifierName: m.modifierName,
            parentProductName: m.orderItem.menuItemName,
            timesSelected: qty,
            additionalRevenue: decStr(addRev),
          },
        });
      }
    }

    return [...map.values()]
      .map((v) => v.row)
      .sort((a, b) => b.timesSelected - a.timesSelected);
  }

  async getPaymentReport(businessId: string, filters: ReportFilters): Promise<PaymentReportRow[]> {
    const { from, to } = resolveReportDateRange(filters);
    const payments = await prisma.orderPayment.findMany({
      where: {
        businessId,
        createdAt: { gte: from, lte: to },
        order: { status: 'COMPLETED' },
      },
      select: { method: true, amount: true },
    });

    const map = new Map<string, { count: number; total: number }>();
    for (const p of payments) {
      const b = map.get(p.method) ?? { count: 0, total: 0 };
      b.count += 1;
      b.total += dec(p.amount);
      map.set(p.method, b);
    }

    if (map.size === 0) {
      const fallback = await prisma.order.groupBy({
        by: ['paymentMethod'],
        where: buildCompletedOrderWhere(businessId, filters),
        _sum: { totalAmount: true },
        _count: true,
      });
      return fallback
        .filter((g) => g.paymentMethod)
        .map((g) => ({
          method: g.paymentMethod!,
          transactionCount: g._count,
          totalAmount: decStr(dec(g._sum.totalAmount)),
          refundAmount: '0.00',
          netAmount: decStr(dec(g._sum.totalAmount)),
          tips: '0.00',
        }));
    }

    return [...map.entries()]
      .map(([method, data]) => ({
        method,
        transactionCount: data.count,
        totalAmount: decStr(data.total),
        refundAmount: '0.00',
        netAmount: decStr(data.total),
        tips: '0.00',
      }))
      .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
  }

  async getEmployeeReport(businessId: string, filters: ReportFilters): Promise<EmployeeReportRow[]> {
    const orders = await prisma.order.findMany({
      where: buildCompletedOrderWhere(businessId, filters),
      select: {
        totalAmount: true,
        discountAmount: true,
        createdBy: { select: { id: true, name: true } },
        waiter: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });

    const map = new Map<string, EmployeeReportRow & { sales: number; disc: number }>();

    function touch(id: string, name: string, role: string, total: number, disc: number) {
      const row = map.get(id) ?? {
        employeeId: id,
        employeeName: name,
        roleHint: role,
        ordersProcessed: 0,
        salesTotal: '0',
        discounts: '0',
        tips: '0.00',
        sales: 0,
        disc: 0,
      };
      row.ordersProcessed += 1;
      row.sales += total;
      row.disc += disc;
      row.salesTotal = decStr(row.sales);
      row.discounts = decStr(row.disc);
      map.set(id, row);
    }

    for (const o of orders) {
      const total = dec(o.totalAmount);
      const disc = dec(o.discountAmount);
      const processor = o.completedBy ?? o.createdBy;
      if (processor) touch(processor.id, processor.name, 'Staff', total, disc);
      if (o.waiter && o.waiter.id !== processor?.id) {
        touch(o.waiter.id, o.waiter.name, 'Waiter', total, 0);
      }
    }

    return [...map.values()]
      .map(({ sales: _s, disc: _d, ...row }) => row)
      .sort((a, b) => Number(b.salesTotal) - Number(a.salesTotal));
  }

  async getOrderTypeReport(businessId: string, filters: ReportFilters): Promise<OrderTypeReportRow[]> {
    const groups = await prisma.order.groupBy({
      by: ['orderType'],
      where: buildCompletedOrderWhere(businessId, filters),
      _sum: { totalAmount: true, discountAmount: true, serviceAmount: true },
      _count: true,
    });

    return groups
      .map((g) => ({
        orderType: g.orderType,
        orderCount: g._count,
        revenue: decStr(dec(g._sum.totalAmount)),
        averageOrderValue: decStr(g._count > 0 ? dec(g._sum.totalAmount) / g._count : 0),
        discounts: decStr(dec(g._sum.discountAmount)),
        serviceCharges: decStr(dec(g._sum.serviceAmount)),
      }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }

  async getTableReport(businessId: string, filters: ReportFilters): Promise<TableReportRow[]> {
    const groups = await prisma.order.groupBy({
      by: ['tableId'],
      where: { ...buildCompletedOrderWhere(businessId, filters), tableId: { not: null } },
      _sum: { totalAmount: true },
      _count: true,
    });

    const tableIds = groups.map((g) => g.tableId!).filter(Boolean);
    const tables = await prisma.floorTable.findMany({
      where: { businessId, id: { in: tableIds } },
      select: { id: true, tableIdentifier: true },
    });
    const tableMap = new Map(tables.map((t) => [t.id, t.tableIdentifier]));

    return groups
      .filter((g) => g.tableId)
      .map((g) => ({
        tableId: g.tableId!,
        tableIdentifier: tableMap.get(g.tableId!) ?? '—',
        orderCount: g._count,
        revenue: decStr(dec(g._sum.totalAmount)),
        averageOrderValue: decStr(g._count > 0 ? dec(g._sum.totalAmount) / g._count : 0),
      }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }

  async getDeliveryReport(businessId: string, filters: ReportFilters): Promise<DeliveryReportRow[]> {
    const { from, to } = resolveReportDateRange(filters);
    const orders = await prisma.order.findMany({
      where: {
        businessId,
        orderType: 'DELIVERY',
        createdAt: { gte: from, lte: to },
        riderId: { not: null },
        ...(filters.riderId ? { riderId: filters.riderId } : {}),
      },
      select: {
        riderId: true,
        status: true,
        deliveryStatus: true,
        totalAmount: true,
        rider: { select: { id: true, name: true } },
      },
    });

    const map = new Map<string, DeliveryReportRow & { sales: number }>();
    for (const o of orders) {
      if (!o.riderId || !o.rider) continue;
      const row = map.get(o.riderId) ?? {
        riderId: o.riderId,
        riderName: o.rider.name,
        assigned: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        deliverySales: '0',
        sales: 0,
      };
      row.assigned += 1;
      if (o.status === 'CANCELLED') row.cancelled += 1;
      else if (o.deliveryStatus === 'DELIVERED' || o.status === 'COMPLETED') {
        row.completed += 1;
        row.sales += dec(o.totalAmount);
      } else row.pending += 1;
      row.deliverySales = decStr(row.sales);
      map.set(o.riderId, row);
    }

    return [...map.values()]
      .map(({ sales: _s, ...row }) => row)
      .sort((a, b) => b.completed - a.completed);
  }

  async getCustomerReport(businessId: string, filters: ReportFilters, limit = 50): Promise<CustomerReportRow[]> {
    const orders = await prisma.order.findMany({
      where: {
        ...buildCompletedOrderWhere(businessId, filters),
        customerId: { not: null },
      },
      select: {
        customerId: true,
        totalAmount: true,
        customer: { select: { id: true, name: true, loyaltyPoints: true } },
      },
    });

    const map = new Map<string, CustomerReportRow & { total: number }>();
    for (const o of orders) {
      if (!o.customerId || !o.customer) continue;
      const row = map.get(o.customerId) ?? {
        customerId: o.customerId,
        name: o.customer.name,
        orderCount: 0,
        totalSpent: '0',
        averageOrderValue: '0',
        loyaltyPoints: o.customer.loyaltyPoints,
        total: 0,
      };
      row.orderCount += 1;
      row.total += dec(o.totalAmount);
      row.totalSpent = decStr(row.total);
      row.averageOrderValue = decStr(row.orderCount > 0 ? row.total / row.orderCount : 0);
      map.set(o.customerId, row);
    }

    return [...map.values()]
      .map(({ total: _t, ...row }) => row)
      .sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))
      .slice(0, limit);
  }

  async getPromotionReport(businessId: string, filters: ReportFilters): Promise<PromotionReportRow[]> {
    const orders = await prisma.order.findMany({
      where: {
        ...buildCompletedOrderWhere(businessId, filters),
        promotionId: { not: null },
      },
      select: {
        promotionId: true,
        totalAmount: true,
        discountAmount: true,
        promotion: { select: { id: true, title: true } },
      },
    });

    const map = new Map<
      string,
      PromotionReportRow & { rev: number; disc: number }
    >();
    for (const o of orders) {
      if (!o.promotionId || !o.promotion) continue;
      const row = map.get(o.promotionId) ?? {
        promotionId: o.promotionId,
        title: o.promotion.title,
        useCount: 0,
        totalDiscount: '0',
        revenue: '0',
        averageOrderValue: '0',
        rev: 0,
        disc: 0,
      };
      row.useCount += 1;
      row.rev += dec(o.totalAmount);
      row.disc += dec(o.discountAmount);
      row.totalDiscount = decStr(row.disc);
      row.revenue = decStr(row.rev);
      row.averageOrderValue = decStr(row.useCount > 0 ? row.rev / row.useCount : 0);
      map.set(o.promotionId, row);
    }

    return [...map.values()]
      .map(({ rev: _r, disc: _d, ...row }) => row)
      .sort((a, b) => Number(b.totalDiscount) - Number(a.totalDiscount));
  }

  async getPurchaseReport(businessId: string, filters: ReportFilters): Promise<PurchaseReportRow[]> {
    const { from, to } = resolveReportDateRange(filters);
    const purchases = await prisma.inventoryPurchase.findMany({
      where: {
        businessId,
        purchasedAt: { gte: from, lte: to },
        ...(filters.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
        ...(filters.supplier
          ? { supplier: { contains: filters.supplier, mode: 'insensitive' } }
          : {}),
      },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    return purchases.map((p) => ({
      id: p.id,
      purchasedAt: p.purchasedAt.toISOString(),
      supplier: p.supplier,
      itemName: p.inventoryItem.name,
      quantity: decStr(dec(p.quantity)),
      unit: p.inventoryItem.unit,
      unitCost: p.unitCost ? decStr(dec(p.unitCost)) : null,
      totalCost: p.totalCost ? decStr(dec(p.totalCost)) : null,
      invoiceRef: p.invoiceRef,
      addedByName: p.createdBy.name,
    }));
  }

  async getWastageReport(businessId: string, filters: ReportFilters): Promise<WastageReportRow[]> {
    const { from, to } = resolveReportDateRange(filters);
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        businessId,
        type: 'WASTE',
        createdAt: { gte: from, lte: to },
        ...(filters.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
      },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = movements.map((m) => m.createdById).filter((id): id is string => id != null);
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { businessId, id: { in: [...new Set(userIds)] } },
            select: { id: true, name: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return movements.map((m) => {
      const qty = Math.abs(dec(m.quantityDelta));
      const cost = m.unitCost ? dec(m.unitCost) : null;
      return {
        id: m.id,
        itemName: m.inventoryItem.name,
        quantity: decStr(qty),
        unit: m.inventoryItem.unit,
        reason: m.wastageReason,
        note: m.note,
        employeeName: (m.createdById ? userMap.get(m.createdById) : null) ?? '—',
        createdAt: m.createdAt.toISOString(),
        estimatedValue: cost != null ? decStr(qty * cost) : null,
      };
    });
  }

  async getInventoryReport(businessId: string, filters: ReportFilters): Promise<InventoryReportRow[]> {
    const { from, to } = resolveReportDateRange(filters);
    const items = await prisma.inventoryItem.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        businessId,
        createdAt: { gte: from, lte: to },
        ...(filters.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
      },
      select: { inventoryItemId: true, type: true, quantityDelta: true },
    });

    const byItem = new Map<string, { purchased: number; sales: number; wastage: number; adj: number; sum: number }>();
    for (const m of movements) {
      const b = byItem.get(m.inventoryItemId) ?? {
        purchased: 0,
        sales: 0,
        wastage: 0,
        adj: 0,
        sum: 0,
      };
      const delta = dec(m.quantityDelta);
      b.sum += delta;
      switch (m.type) {
        case 'RECEIPT':
          b.purchased += delta;
          break;
        case 'SALE':
          b.sales += -delta;
          break;
        case 'WASTE':
          b.wastage += -delta;
          break;
        default:
          b.adj += delta;
      }
      byItem.set(m.inventoryItemId, b);
    }

    return items.map((item) => {
      const act = byItem.get(item.id) ?? { purchased: 0, sales: 0, wastage: 0, adj: 0, sum: 0 };
      const current = dec(item.currentQuantity);
      const opening = current - act.sum;
      const expected = opening + act.purchased + act.adj - act.sales - act.wastage;
      return {
        inventoryItemId: item.id,
        itemName: item.name,
        unit: item.unit,
        currentStock: decStr(current),
        stockStatus: stockStatus(current, item.minThreshold ? dec(item.minThreshold) : null),
        opening: decStr(opening),
        purchased: decStr(act.purchased),
        salesConsumption: decStr(act.sales),
        wastage: decStr(act.wastage),
        adjustments: decStr(act.adj),
        expectedClosing: decStr(expected),
      };
    });
  }

  async getOrderReport(
    businessId: string,
    filters: ReportFilters & { page?: number; limit?: number; search?: string },
  ): Promise<PaginatedResult<OrderReportRow>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const skip = (page - 1) * limit;
    const baseWhere = buildCompletedOrderWhere(businessId, filters);
    const searchClauses: Prisma.OrderWhereInput[] = [];
    if (filters.search) {
      const or: Prisma.OrderWhereInput[] = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search, mode: 'insensitive' } },
      ];
      const ticketNum = parseInt(filters.search.replace(/\D/g, ''), 10);
      if (!Number.isNaN(ticketNum)) or.push({ ticketNumber: ticketNum });
      searchClauses.push({ OR: or });
    }
    const where: Prisma.OrderWhereInput =
      searchClauses.length > 0 ? { AND: [baseWhere, ...searchClauses] } : baseWhere;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          table: { select: { tableIdentifier: true } },
          createdBy: { select: { name: true } },
          waiter: { select: { name: true } },
          rider: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      rows: orders.map((o) => ({
        id: o.id,
        ticketNumber: o.ticketNumber != null && o.ticketPrefix
          ? formatOrderTicketLabel(o.ticketPrefix, o.ticketNumber)
          : null,
        createdAt: o.createdAt.toISOString(),
        orderType: o.orderType,
        source: o.source,
        status: o.status,
        tableIdentifier: o.table?.tableIdentifier ?? null,
        customerName: o.customerName,
        createdByName: o.createdBy?.name ?? null,
        waiterName: o.waiter?.name ?? null,
        riderName: o.rider?.name ?? null,
        subtotal: decStr(dec(o.subtotal)),
        discountAmount: decStr(dec(o.discountAmount)),
        taxAmount: decStr(dec(o.taxAmount)),
        serviceAmount: decStr(dec(o.serviceAmount)),
        totalAmount: decStr(dec(o.totalAmount)),
        paymentMethod: o.paymentMethod,
        itemCount: o._count.items,
      })),
      total,
      page,
      limit,
    };
  }

  exportCsv(headers: string[], rows: (string | number | null | undefined)[][]): { csv: string; filename: string } {
    const lines = [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))];
    return { csv: lines.join('\n'), filename: `report-${formatDateKey(new Date())}.csv` };
  }
}

export const prismaAnalyticsRepository = new PrismaAnalyticsRepository();
