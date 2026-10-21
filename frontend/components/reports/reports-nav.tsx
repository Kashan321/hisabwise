'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const REPORT_LINKS = [
  { id: '', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'products', label: 'Products' },
  { id: 'profit', label: 'Estimated Profit' },
  { id: 'variants', label: 'Variants' },
  { id: 'modifiers', label: 'Modifiers' },
  { id: 'payments', label: 'Payments' },
  { id: 'employees', label: 'Employees' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'wastage', label: 'Wastage' },
  { id: 'orders', label: 'Orders' },
  { id: 'order-types', label: 'Order Types' },
  { id: 'tables', label: 'Tables' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'customers', label: 'Customers' },
  { id: 'tips', label: 'Tips' },
  { id: 'promotions', label: 'Promotions' },
] as const;

export const REPORT_META: Record<
  string,
  { title: string; description: string; exportType?: string }
> = {
  sales: {
    title: 'Sales Report',
    description: 'Revenue, discounts, taxes, and sales trends for completed orders.',
    exportType: 'sales',
  },
  products: {
    title: 'Product Performance',
    description: 'Top and bottom products by quantity sold and revenue.',
    exportType: 'products',
  },
  profit: {
    title: 'Estimated Profit Report',
    description:
      'Estimated profit from completed sales for products that have a base price set on the menu.',
    exportType: 'profit',
  },
  variants: {
    title: 'Variant Performance',
    description: 'Sales breakdown by product variant (size, style, etc.).',
  },
  modifiers: {
    title: 'Modifier & Add-on Report',
    description: 'Add-on selections and additional revenue generated.',
  },
  payments: {
    title: 'Payment Report',
    description: 'Totals by payment method from order payments.',
    exportType: 'payments',
  },
  employees: {
    title: 'Employee Performance',
    description: 'Orders and sales attributed to staff members.',
  },
  inventory: {
    title: 'Inventory Report',
    description: 'Stock movements, consumption, and expected closing quantities.',
    exportType: 'inventory',
  },
  purchases: {
    title: 'Purchase Report',
    description: 'Inventory purchases recorded during daily sessions.',
    exportType: 'purchases',
  },
  wastage: {
    title: 'Wastage & Variance',
    description: 'Waste events and stock variance from inventory movements.',
    exportType: 'wastage',
  },
  orders: {
    title: 'Orders Report',
    description: 'Detailed list of completed orders with filters and search.',
    exportType: 'orders',
  },
  'order-types': {
    title: 'Order Type Report',
    description: 'Compare dine-in, takeaway, delivery, and QR orders.',
  },
  tables: {
    title: 'Table Performance',
    description: 'Revenue and order counts per restaurant table.',
  },
  delivery: {
    title: 'Delivery & Rider Report',
    description: 'Delivery assignments and rider performance.',
  },
  customers: {
    title: 'Customer Analytics',
    description: 'Customer spending, loyalty, and top customers.',
  },
  tips: {
    title: 'Tips Report',
    description: 'Tip attribution and totals where tracked.',
  },
  promotions: {
    title: 'Discount & Promotion Report',
    description: 'Promotion usage and discount amounts applied.',
  },
};

function reportLinkClass(active: boolean, compact?: boolean) {
  const size = compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const state = active
    ? 'bg-primary text-on-primary'
    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container';
  return `shrink-0 rounded-lg font-caption transition-colors ${size} ${state}`;
}

export function ReportsNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/${slug}/reports`;

  function renderLink(link: (typeof REPORT_LINKS)[number], compact?: boolean) {
    const href = link.id ? `${base}/${link.id}` : base;
    const active =
      link.id === ''
        ? pathname === base || pathname === `${base}/`
        : pathname.startsWith(`${base}/${link.id}`);

    return (
      <Link
        key={link.id || 'overview'}
        href={href}
        className={`${reportLinkClass(active, compact)} ${compact ? 'snap-start' : ''}`}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <nav
      className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-2 md:p-3"
      aria-label="Report sections"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 snap-x snap-mandatory hide-scrollbar md:hidden">
        {REPORT_LINKS.map((link) => renderLink(link, true))}
      </div>
      <div className="hidden md:flex md:flex-wrap gap-2">
        {REPORT_LINKS.map((link) => renderLink(link))}
      </div>
    </nav>
  );
}
