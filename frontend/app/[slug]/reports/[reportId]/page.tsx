'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-shell';
import { OrderDetailDrawer } from '@/components/orders/order-detail-drawer';
import { ReportsMobileHeader } from '@/components/reports/reports-mobile-header';
import {
  BarChart,
  ExportReportButton,
  PrintReportButton,
  ReportPanel,
  ReportStatGrid,
  ReportTable,
} from '@/components/reports/report-ui';
import { ReportFiltersBar, useReportFilterState } from '@/components/reports/report-filters';
import { formatSalesTrendBucketLabel } from '@/lib/report-dates';
import { REPORT_META } from '@/components/reports/reports-nav';
import {
  useMenu,
  useOrder,
  useReportCustomers,
  useReportDelivery,
  useReportEmployees,
  useReportInventory,
  useReportModifiers,
  useReportOrderTypes,
  useReportOrders,
  useReportPayments,
  useReportProducts,
  useReportProfit,
  useReportPromotions,
  useReportPurchases,
  useReportSales,
  useReportTables,
  useReportTips,
  useReportVariants,
  useReportWastage,
  useStaff,
} from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { paymentMethodLabel } from '@/lib/payment-methods';
import type { ReportFilterConfig } from '@/components/reports/report-filters';

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine-in',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  QR: 'QR',
};

const FILTER_CONFIG: Record<string, ReportFilterConfig> = {
  sales: { date: true, orderType: true, paymentMethod: true },
  products: { date: true, category: true, product: true, sort: true },
  profit: { date: true, category: true, product: true },
  variants: { date: true, category: true, product: true },
  modifiers: { date: true, product: true },
  payments: { date: true, paymentMethod: true },
  employees: { date: true, employee: true },
  inventory: { date: true, inventoryItem: true },
  purchases: { date: true, inventoryItem: true, supplier: true },
  wastage: { date: true, inventoryItem: true },
  orders: { date: true, orderType: true, paymentMethod: true, search: true },
  'order-types': { date: true },
  tables: { date: true, table: true },
  delivery: { date: true, rider: true },
  customers: { date: true },
  tips: { date: true },
  promotions: { date: true },
};

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string; reportId: string }>;
}) {
  const { reportId } = use(params);
  const meta = REPORT_META[reportId];
  const formatMoney = useFormatMoney();
  const filterState = useReportFilterState('today');
  const {
    filters,
    rangeLabel,
    preset,
    setPreset,
    useCustom,
    setUseCustom,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    setExtra,
  } = filterState;

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data: staff = [] } = useStaff();
  const { data: menuData } = useMenu();
  const { data: selectedOrder } = useOrder(selectedOrderId ?? '');

  const employeeOptions = useMemo(
    () => staff.map((s) => ({ value: s.id, label: s.name })),
    [staff],
  );
  const categoryOptions = useMemo(
    () => (menuData?.menu ?? []).map((c) => ({ value: c.id, label: c.name })),
    [menuData],
  );
  const productOptions = useMemo(
    () =>
      (menuData?.menu ?? []).flatMap((c) =>
        (c.items ?? []).map((i) => ({ value: i.id, label: i.name })),
      ),
    [menuData],
  );
  const riderOptions = useMemo(
    () => staff.filter((s) => s.roles?.includes('rider')).map((s) => ({ value: s.id, label: s.name })),
    [staff],
  );

  useEffect(() => {
    setExtra({});
  }, [reportId, preset, useCustom, customFrom, customTo, setExtra]);

  const sales = useReportSales(reportId === 'sales' ? filters : undefined);
  const products = useReportProducts(reportId === 'products' ? filters : undefined);
  const profit = useReportProfit(reportId === 'profit' ? filters : undefined);
  const variants = useReportVariants(reportId === 'variants' ? filters : undefined);
  const modifiers = useReportModifiers(reportId === 'modifiers' ? filters : undefined);
  const payments = useReportPayments(reportId === 'payments' ? filters : undefined);
  const employees = useReportEmployees(reportId === 'employees' ? filters : undefined);
  const inventory = useReportInventory(reportId === 'inventory' ? filters : undefined);
  const purchases = useReportPurchases(reportId === 'purchases' ? filters : undefined);
  const wastage = useReportWastage(reportId === 'wastage' ? filters : undefined);
  const orders = useReportOrders(reportId === 'orders' ? filters : undefined);
  const orderTypes = useReportOrderTypes(reportId === 'order-types' ? filters : undefined);
  const tables = useReportTables(reportId === 'tables' ? filters : undefined);
  const delivery = useReportDelivery(reportId === 'delivery' ? filters : undefined);
  const customers = useReportCustomers(reportId === 'customers' ? filters : undefined);
  const tips = useReportTips(reportId === 'tips' ? filters : undefined);
  const promotions = useReportPromotions(reportId === 'promotions' ? filters : undefined);

  if (!meta) {
    return (
      <PageHeader
        icon="analytics"
        title="Report not found"
        description="The requested report does not exist."
      />
    );
  }

  const config = FILTER_CONFIG[reportId] ?? { date: true };

  function patchFilters(next: typeof filters) {
    setExtra({
      orderType: next.orderType,
      paymentMethod: next.paymentMethod,
      employeeId: next.employeeId,
      categoryId: next.categoryId,
      menuItemId: next.menuItemId,
      tableId: next.tableId,
      riderId: next.riderId,
      inventoryItemId: next.inventoryItemId,
      supplier: next.supplier,
      search: next.search,
      sort: next.sort,
      page: next.page,
      limit: next.limit,
    });
  }

  const reportLoading =
    (reportId === 'sales' && sales.isLoading) ||
    (reportId === 'products' && products.isLoading) ||
    (reportId === 'profit' && profit.isLoading) ||
    (reportId === 'variants' && variants.isLoading) ||
    (reportId === 'modifiers' && modifiers.isLoading) ||
    (reportId === 'payments' && payments.isLoading) ||
    (reportId === 'employees' && employees.isLoading) ||
    (reportId === 'inventory' && inventory.isLoading) ||
    (reportId === 'purchases' && purchases.isLoading) ||
    (reportId === 'wastage' && wastage.isLoading) ||
    (reportId === 'orders' && orders.isLoading) ||
    (reportId === 'order-types' && orderTypes.isLoading) ||
    (reportId === 'tables' && tables.isLoading) ||
    (reportId === 'delivery' && delivery.isLoading) ||
    (reportId === 'customers' && customers.isLoading) ||
    (reportId === 'tips' && tips.isLoading) ||
    (reportId === 'promotions' && promotions.isLoading);

  const printInput = {
    reportId,
    title: meta.title,
    rangeLabel,
    formatMoney,
    sales: sales.data,
    products: products.data,
    profit: profit.data,
    variants: variants.data,
    modifiers: modifiers.data,
    payments: payments.data,
    employees: employees.data,
    inventory: inventory.data,
    purchases: purchases.data,
    wastage: wastage.data,
    orders: orders.data?.rows,
    orderTypes: orderTypes.data,
    tables: tables.data,
    delivery: delivery.data,
    customers: customers.data,
    tips: tips.data,
    promotions: promotions.data,
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <PrintReportButton printInput={printInput} disabled={reportLoading} />
      {meta.exportType ? (
        <ExportReportButton exportType={meta.exportType} filters={filters} />
      ) : null}
    </div>
  );

  return (
    <>
      <ReportsMobileHeader title={meta.title} badge={rangeLabel} actions={headerActions} />

      <div className="hidden md:block">
        <PageHeader
          icon="analytics"
          title={meta.title}
          description={meta.description}
          badge={rangeLabel}
          actions={headerActions}
        />
      </div>

      <div className="flex flex-col gap-4 md:gap-6">
        <ReportFiltersBar
          config={config}
          value={filters}
          onChange={patchFilters}
          employees={employeeOptions}
          categories={categoryOptions}
          products={productOptions}
          riders={riderOptions}
          preset={preset}
          setPreset={setPreset}
          useCustom={useCustom}
          setUseCustom={setUseCustom}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
        />

        {reportId === 'sales' && (
          <>
            <ReportStatGrid
              loading={sales.isLoading}
              formatMoney={formatMoney}
              stats={
                sales.data
                  ? [
                      { label: 'Gross sales', value: sales.data.grossSales },
                      { label: 'Net sales', value: sales.data.netSales },
                      { label: 'Orders', value: sales.data.orderCount },
                      { label: 'Avg order', value: sales.data.averageOrderValue },
                      { label: 'Discounts', value: sales.data.discounts },
                      { label: 'Tax', value: sales.data.taxes },
                      { label: 'Service charges', value: sales.data.serviceCharges },
                      { label: 'Refunds', value: sales.data.refunds },
                    ]
                  : []
              }
            />
            <ReportPanel title="Sales trend">
              <BarChart
                items={(sales.data?.trend ?? []).map((t) => ({
                  label: formatSalesTrendBucketLabel(t.bucket, {
                    from: filters.from ?? '',
                    to: filters.to ?? '',
                  }),
                  revenue: t.revenue,
                  orderCount: t.orderCount,
                }))}
                valueKey="revenue"
                labelKey="label"
                formatValue={(v) => formatMoney(v)}
                formatBarTitle={(item, value) => {
                  const orders = item.orderCount;
                  const sales = formatMoney(value);
                  return typeof orders === 'number' ? `${orders} orders · ${sales}` : sales;
                }}
              />
            </ReportPanel>
          </>
        )}

        {reportId === 'products' && (
          <ReportPanel title="Product performance">
            <ReportTable
              loading={products.isLoading}
              headers={['Product', 'Category', 'Qty', 'Revenue', 'Avg price', 'Orders']}
              rows={(products.data ?? []).map((p) => [
                p.name,
                p.categoryName,
                p.quantitySold,
                formatMoney(p.revenue),
                formatMoney(p.averageSellingPrice),
                p.orderCount,
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'profit' && (
          <>
            <p className="font-caption text-on-surface-variant rounded-xl bg-surface-container-low px-4 py-3">
              Only products with a base price set are included. Estimated profit is calculated from
              menu base prices on items and variants.
              {profit.data?.summary && profit.data.summary.quantityMissingCost > 0
                ? ` ${profit.data.summary.quantityMissingCost} sold units were excluded because no base price is set.`
                : ''}
            </p>
            <ReportStatGrid
              loading={profit.isLoading}
              formatMoney={formatMoney}
              stats={
                profit.data?.summary
                  ? [
                      { label: 'Revenue', value: profit.data.summary.revenue },
                      { label: 'Estimated cost', value: profit.data.summary.estimatedCost },
                      { label: 'Estimated profit', value: profit.data.summary.estimatedProfit },
                      {
                        label: 'Estimated margin',
                        value: profit.data.summary.estimatedMarginPercent
                          ? `${profit.data.summary.estimatedMarginPercent}%`
                          : '—',
                      },
                      { label: 'Qty sold (with base price)', value: profit.data.summary.quantitySold },
                    ]
                  : []
              }
            />
            <ReportPanel title="Estimated profit by product">
              <ReportTable
                loading={profit.isLoading}
                headers={[
                  'Product',
                  'Category',
                  'Qty',
                  'Revenue',
                  'Est. cost',
                  'Est. profit',
                  'Est. margin',
                ]}
                rows={(profit.data?.rows ?? []).map((row) => [
                  row.name,
                  row.categoryName,
                  row.quantitySold,
                  formatMoney(row.revenue),
                  formatMoney(row.estimatedCost),
                  formatMoney(row.estimatedProfit),
                  row.estimatedMarginPercent ? `${row.estimatedMarginPercent}%` : '—',
                ])}
              />
            </ReportPanel>
          </>
        )}

        {reportId === 'variants' && (
          <ReportPanel title="Variant performance">
            <ReportTable
              loading={variants.isLoading}
              headers={['Variant', 'Product', 'Qty sold', 'Revenue']}
              rows={(variants.data ?? []).map((v) => [
                v.variantName,
                v.parentProductName,
                v.quantitySold,
                formatMoney(v.revenue),
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'modifiers' && (
          <ReportPanel title="Modifiers & add-ons">
            <ReportTable
              loading={modifiers.isLoading}
              headers={['Modifier', 'Product', 'Selections', 'Add. revenue']}
              rows={(modifiers.data ?? []).map((m) => [
                m.modifierName,
                m.parentProductName,
                m.timesSelected,
                formatMoney(m.additionalRevenue),
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'payments' && (
          <>
            <ReportPanel title="By payment method">
              <ReportTable
                loading={payments.isLoading}
                headers={['Method', 'Transactions', 'Total', 'Net']}
                rows={(payments.data ?? []).map((p) => [
                  paymentMethodLabel(p.method),
                  p.transactionCount,
                  formatMoney(p.totalAmount),
                  formatMoney(p.netAmount),
                ])}
              />
            </ReportPanel>
            <ReportPanel title="Chart">
              <BarChart
                items={(payments.data ?? []).map((p) => ({
                  label: paymentMethodLabel(p.method),
                  totalAmount: p.totalAmount,
                }))}
                valueKey="totalAmount"
                labelKey="label"
                formatValue={(v) => formatMoney(v)}
              />
            </ReportPanel>
          </>
        )}

        {reportId === 'employees' && (
          <ReportPanel title="Employee performance">
            <ReportTable
              loading={employees.isLoading}
              headers={['Employee', 'Role', 'Orders', 'Sales', 'Discounts']}
              rows={(employees.data ?? []).map((e) => [
                e.employeeName,
                e.roleHint,
                e.ordersProcessed,
                formatMoney(e.salesTotal),
                formatMoney(e.discounts),
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'inventory' && (
          <ReportPanel title="Inventory movements">
            <ReportTable
              loading={inventory.isLoading}
              headers={[
                'Item',
                'Current',
                'Opening',
                'Purchased',
                'Sales use',
                'Wastage',
                'Adj.',
                'Expected',
              ]}
              rows={(inventory.data ?? []).map((r) => [
                r.itemName,
                `${r.currentStock} ${r.unit}`,
                r.opening,
                r.purchased,
                r.salesConsumption,
                r.wastage,
                r.adjustments,
                r.expectedClosing,
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'purchases' && (
          <ReportPanel title="Purchases">
            <ReportTable
              loading={purchases.isLoading}
              headers={['Date', 'Supplier', 'Item', 'Qty', 'Cost', 'Invoice', 'By']}
              rows={(purchases.data ?? []).map((p) => [
                new Date(p.purchasedAt).toLocaleString(),
                p.supplier,
                p.itemName,
                `${p.quantity} ${p.unit}`,
                p.totalCost ? formatMoney(p.totalCost) : '—',
                p.invoiceRef,
                p.addedByName,
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'wastage' && (
          <ReportPanel title="Wastage events">
            <ReportTable
              loading={wastage.isLoading}
              headers={['Date', 'Item', 'Qty', 'Reason', 'Value', 'Employee']}
              rows={(wastage.data ?? []).map((w) => [
                new Date(w.createdAt).toLocaleString(),
                w.itemName,
                `${w.quantity} ${w.unit}`,
                w.reason,
                w.estimatedValue ? formatMoney(w.estimatedValue) : '—',
                w.employeeName,
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'orders' && (
          <ReportPanel title="Orders">
            <ReportTable
              loading={orders.isLoading}
              headers={['Ticket', 'Date', 'Type', 'Customer', 'Total', 'Payment', 'Items']}
              rows={(orders.data?.rows ?? []).map((o) => [
                o.ticketNumber,
                new Date(o.createdAt).toLocaleString(),
                ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
                o.customerName,
                formatMoney(o.totalAmount),
                o.paymentMethod ? paymentMethodLabel(o.paymentMethod) : '—',
                o.itemCount,
              ])}
              onRowClick={(idx) => {
                const row = orders.data?.rows[idx];
                if (row) setSelectedOrderId(row.id);
              }}
            />
          </ReportPanel>
        )}

        {reportId === 'order-types' && (
          <ReportPanel title="By order type">
            <ReportTable
              loading={orderTypes.isLoading}
              headers={['Type', 'Orders', 'Revenue', 'Avg order', 'Discounts']}
              rows={(orderTypes.data ?? []).map((o) => [
                ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
                o.orderCount,
                formatMoney(o.revenue),
                formatMoney(o.averageOrderValue),
                formatMoney(o.discounts),
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'tables' && (
          <ReportPanel title="Table performance">
            <ReportTable
              loading={tables.isLoading}
              headers={['Table', 'Orders', 'Revenue', 'Avg order']}
              rows={(tables.data ?? []).map((t) => [
                t.tableIdentifier,
                t.orderCount,
                formatMoney(t.revenue),
                formatMoney(t.averageOrderValue),
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'delivery' && (
          <ReportPanel title="Rider performance">
            <ReportTable
              loading={delivery.isLoading}
              headers={['Rider', 'Assigned', 'Completed', 'Cancelled', 'Pending', 'Sales']}
              rows={(delivery.data ?? []).map((d) => [
                d.riderName,
                d.assigned,
                d.completed,
                d.cancelled,
                d.pending,
                formatMoney(d.deliverySales),
              ])}
            />
          </ReportPanel>
        )}

        {reportId === 'customers' && (
          <>
            <ReportStatGrid
              loading={customers.isLoading}
              formatMoney={formatMoney}
              stats={
                customers.data
                  ? [
                      { label: 'Customers', value: customers.data.totalCustomers },
                      { label: 'Orders', value: customers.data.totalOrders },
                      { label: 'Total spending', value: customers.data.totalSpending },
                      { label: 'Avg order', value: customers.data.averageOrderValue },
                    ]
                  : []
              }
            />
            <ReportPanel title="Top customers">
              <ReportTable
                loading={customers.isLoading}
                headers={['Customer', 'Orders', 'Spent', 'Avg order', 'Loyalty pts']}
                rows={(customers.data?.topCustomers ?? []).map((c) => [
                  c.name,
                  c.orderCount,
                  formatMoney(c.totalSpent),
                  formatMoney(c.averageOrderValue),
                  c.loyaltyPoints,
                ])}
              />
            </ReportPanel>
          </>
        )}

        {reportId === 'tips' && (
          <ReportPanel title="Tips">
            {tips.data && !tips.data.tipsAvailable ? (
              <p className="font-body text-on-surface-variant">{tips.data.note}</p>
            ) : (
              <ReportTable
                loading={tips.isLoading}
                headers={['Employee', 'Tips']}
                rows={(tips.data?.byEmployee ?? []).map((e) => [
                  e.employeeName,
                  formatMoney(e.tips),
                ])}
              />
            )}
          </ReportPanel>
        )}

        {reportId === 'promotions' && (
          <ReportPanel title="Promotions">
            <ReportTable
              loading={promotions.isLoading}
              headers={['Promotion', 'Uses', 'Discount', 'Revenue', 'Avg order']}
              rows={(promotions.data ?? []).map((p) => [
                p.title,
                p.useCount,
                formatMoney(p.totalDiscount),
                formatMoney(p.revenue),
                formatMoney(p.averageOrderValue),
              ])}
            />
          </ReportPanel>
        )}
      </div>

      <OrderDetailDrawer
        open={selectedOrderId != null}
        onClose={() => setSelectedOrderId(null)}
        order={selectedOrder ?? null}
        tableLabel={selectedOrder?.tableIdentifier ?? '—'}
        onPrint={() => {}}
      />
    </>
  );
}
