import type { AuthUser } from '@/lib/api/types';
import { POS_TERMINAL_ENABLED, SUPPLIER_EXPENSES_ENABLED } from '@/lib/feature-flags';

export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasRole(user: AuthUser | null | undefined, role: string): boolean {
  if (!user) return false;
  return user.roles.includes(role);
}

export function isWaiterOnly(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return hasRole(user, 'waiter') && !hasAnyPermission(user, ['orders.manage', '*']);
}

export function isRiderOnly(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return hasRole(user, 'rider') && !hasAnyPermission(user, ['delivery.manage', '*']);
}

export function isChefOnly(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (!hasRole(user, 'chef')) return false;
  return !hasAnyPermission(user, [
    '*',
    'orders.manage',
    'staff.manage',
    'menu.manage',
    'reports.view',
    'cash.shift',
  ]);
}

export interface NavItem {
  href: string;
  icon: string;
  label: string;
  permissions?: string[];
  roles?: string[];
}

export interface TenantRouteRule {
  path: string;
  permissions?: string[];
  /** Subscription and similar — any logged-in tenant user */
  allowAllAuthenticated?: boolean;
}

/** Route access rules for staff areas under `/[slug]/…`. Longest path match wins. */
export const TENANT_ROUTE_RULES: TenantRouteRule[] = [
  { path: 'waiter/orders/new', permissions: ['orders.create', 'orders.serve', 'orders.manage'] },
  { path: 'waiter/orders', permissions: ['orders.serve', 'orders.view', 'orders.manage'] },
  { path: 'waiter/tables', permissions: ['orders.serve', 'floor.view', 'orders.manage'] },
  { path: 'waiter', permissions: ['orders.serve', 'orders.manage'] },
  { path: 'rider', permissions: ['delivery.execute', 'delivery.view', 'delivery.manage'] },
  { path: 'orders/new', permissions: ['orders.create', 'orders.manage', 'orders.serve'] },
  { path: 'orders', permissions: ['orders.view', 'orders.manage'] },
  ...(POS_TERMINAL_ENABLED
    ? [{ path: 'terminal', permissions: ['orders.create', 'orders.manage', 'cash.shift'] }]
    : []),
  { path: 'cashier', permissions: ['cash.shift', 'orders.manage', 'kitchen.manage'] },
  { path: 'shifts', permissions: ['reports.view', 'orders.manage', '*'] },
  { path: 'business-days', permissions: ['reports.view', 'business.manage', '*'] },
  { path: 'dashboard', permissions: ['orders.manage', 'reports.view', '*'] },
  { path: 'kitchen', permissions: ['kitchen.manage'] },
  { path: 'delivery', permissions: ['delivery.manage', 'delivery.view'] },
  { path: 'menu', permissions: ['menu.manage'] },
  { path: 'inventory/daily', permissions: ['inventory.daily.view', 'inventory.daily.manage', 'inventory.manage'] },
  ...(SUPPLIER_EXPENSES_ENABLED
    ? [{ path: 'inventory/suppliers', permissions: ['inventory.view', 'inventory.manage'] }]
    : []),
  { path: 'inventory', permissions: ['inventory.view', 'inventory.manage'] },
  { path: 'floor-plan', permissions: ['floor.manage', 'floor.view'] },
  { path: 'reservations', permissions: ['reservations.manage'] },
  { path: 'customers', permissions: ['customers.manage', 'customers.view'] },
  { path: 'promotions', permissions: ['promotions.manage'] },
  { path: 'reports', permissions: ['reports.view'] },
  { path: 'qr', permissions: ['qr.manage'] },
  { path: 'staff', permissions: ['staff.manage'] },
  { path: 'settings', permissions: ['business.manage', '*'] },
  { path: 'feedback', permissions: ['feedback.manage', 'business.manage', '*'] },
  { path: 'subscription', allowAllAuthenticated: true },
  { path: 'notifications', allowAllAuthenticated: true },
];

export const BUSINESS_NAV: NavItem[] = [
  { href: 'dashboard', icon: 'dashboard', label: 'Overview', permissions: ['orders.manage', 'reports.view', '*'] },
  { href: 'waiter', icon: 'room_service', label: 'Waiter Home', roles: ['waiter'] },
  { href: 'waiter/tables', icon: 'table_restaurant', label: 'Tables', roles: ['waiter'] },
  { href: 'waiter/orders', icon: 'receipt_long', label: 'My Orders', roles: ['waiter'] },
  { href: 'orders', icon: 'qr_code_2', label: 'Live Orders', permissions: ['orders.view', 'orders.manage'] },
  // { href: 'terminal', icon: 'point_of_sale', label: 'POS Terminal', permissions: ['orders.create', 'orders.manage', 'cash.shift'] },
  { href: 'cashier', icon: 'account_balance_wallet', label: 'Cash Drawer', permissions: ['cash.shift', 'orders.manage', 'kitchen.manage'] },
  { href: 'shifts', icon: 'schedule', label: 'Shift History', permissions: ['reports.view', 'orders.manage', '*'] },
  { href: 'business-days', icon: 'today', label: 'Business Days', permissions: ['reports.view', 'business.manage', '*'] },
  { href: 'kitchen', icon: 'skillet', label: 'Kitchen', permissions: ['kitchen.manage'] },
  { href: 'delivery', icon: 'delivery_dining', label: 'Delivery', permissions: ['delivery.manage', 'delivery.view'] },
  { href: 'rider', icon: 'two_wheeler', label: 'My Deliveries', roles: ['rider'] },
  { href: 'menu', icon: 'restaurant_menu', label: 'Menu Editor', permissions: ['menu.manage'] },
  { href: 'inventory', icon: 'inventory_2', label: 'Inventory', permissions: ['inventory.view', 'inventory.manage'] },
  { href: 'inventory/daily', icon: 'fact_check', label: 'Daily Inventory', permissions: ['inventory.daily.view', 'inventory.daily.manage', 'inventory.manage'] },
  ...(SUPPLIER_EXPENSES_ENABLED
    ? [
        {
          href: 'inventory/suppliers',
          icon: 'local_shipping',
          label: 'Supplier expenses',
          permissions: ['inventory.view', 'inventory.manage'],
        },
      ]
    : []),
  { href: 'floor-plan', icon: 'table_restaurant', label: 'Floor Plan', permissions: ['floor.manage', 'floor.view'] },
  { href: 'reservations', icon: 'event', label: 'Reservations', permissions: ['reservations.manage'] },
  { href: 'customers', icon: 'group', label: 'Customers', permissions: ['customers.manage', 'customers.view'] },
  { href: 'promotions', icon: 'local_offer', label: 'Promotions', permissions: ['promotions.manage'] },
  { href: 'reports', icon: 'analytics', label: 'Reports', permissions: ['reports.view'] },
  { href: 'qr', icon: 'qr_code', label: 'QR Codes', permissions: ['qr.manage'] },
  { href: 'staff', icon: 'badge', label: 'Staff', permissions: ['staff.manage'] },
  { href: 'settings', icon: 'settings', label: 'Settings', permissions: ['business.manage', '*'] },
  { href: 'feedback', icon: 'feedback', label: 'Feedback', permissions: ['feedback.manage', 'business.manage', '*'] },
];

export function isCustomerTenantRoute(subPath: string): boolean {
  return subPath === 'order' || subPath.startsWith('order/') || subPath.startsWith('tables/');
}

export function getTenantSubPath(slug: string, pathname: string): string {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (normalized === `/${slug}`) return 'dashboard';
  const prefix = `/${slug}/`;
  if (!normalized.startsWith(prefix)) return '';
  return normalized.slice(prefix.length);
}

export function getRouteAccessRule(subPath: string): TenantRouteRule | undefined {
  const sorted = [...TENANT_ROUTE_RULES].sort((a, b) => b.path.length - a.path.length);
  for (const rule of sorted) {
    if (subPath === rule.path || subPath.startsWith(`${rule.path}/`)) {
      return rule;
    }
  }
  return undefined;
}

export function getRequiredPermissionsForRoute(subPath: string): string[] | undefined {
  const rule = getRouteAccessRule(subPath);
  if (!rule) return undefined;
  if (rule.allowAllAuthenticated) return undefined;
  return rule.permissions;
}

export function canAccessTenantRoute(
  user: AuthUser | null | undefined,
  slug: string,
  pathname: string,
): boolean {
  if (!user) return false;

  const subPath = getTenantSubPath(slug, pathname);
  if (!subPath) return false;
  if (isCustomerTenantRoute(subPath)) return true;

  const rule = getRouteAccessRule(subPath);
  if (!rule) return false;
  if (rule.allowAllAuthenticated) return true;
  if (!rule.permissions?.length) return false;
  return hasAnyPermission(user, rule.permissions);
}

export function getVisibleNav(user: AuthUser | null | undefined): NavItem[] {
  if (!user) return [];
  if (isRiderOnly(user)) {
    return BUSINESS_NAV.filter((item) => item.href === 'rider');
  }
  if (isChefOnly(user)) {
    return BUSINESS_NAV.filter((item) => item.href === 'kitchen');
  }
  if (isWaiterOnly(user)) {
    return BUSINESS_NAV.filter((item) => item.href.startsWith('waiter'));
  }
  return BUSINESS_NAV.filter((item) => {
    if (item.roles) return false;
    if (item.permissions && !hasAnyPermission(user, item.permissions)) return false;
    return true;
  });
}

export function getDefaultRoute(user: AuthUser | null | undefined, slug: string): string {
  if (!user) return '/login';
  if (isWaiterOnly(user)) return `/${slug}/waiter`;
  if (isRiderOnly(user)) return `/${slug}/rider`;
  if (isChefOnly(user)) return `/${slug}/kitchen`;
  if (hasAnyPermission(user, ['orders.manage', 'reports.view', '*'])) {
    return `/${slug}/dashboard`;
  }
  if (hasAnyPermission(user, ['orders.view', 'orders.create'])) return `/${slug}/orders`;
  if (hasPermission(user, 'cash.shift')) {
    return POS_TERMINAL_ENABLED ? `/${slug}/terminal` : `/${slug}/cashier`;
  }
  if (hasPermission(user, 'kitchen.manage')) return `/${slug}/kitchen`;
  if (hasAnyPermission(user, ['customers.view', 'customers.manage'])) {
    return `/${slug}/customers`;
  }
  return `/${slug}/orders`;
}

/** Best non-kitchen page when leaving the full-screen kitchen display. */
export function getKitchenExitRoute(user: AuthUser | null | undefined, slug: string): string | null {
  if (!user) return `/${slug}/orders`;
  if (isChefOnly(user)) return null;
  if (hasAnyPermission(user, ['orders.manage', 'reports.view', '*'])) {
    return `/${slug}/dashboard`;
  }
  if (hasAnyPermission(user, ['orders.view', 'orders.create'])) return `/${slug}/orders`;
  if (hasPermission(user, 'cash.shift')) {
    return POS_TERMINAL_ENABLED ? `/${slug}/terminal` : `/${slug}/cashier`;
  }
  if (hasAnyPermission(user, ['customers.view', 'customers.manage'])) {
    return `/${slug}/customers`;
  }
  return getDefaultRoute(user, slug);
}

/** Leave full-screen New Bill / POS billing. */
export function getPosBillExitRoute(user: AuthUser | null | undefined, slug: string): string {
  return getKitchenExitRoute(user, slug) ?? `/${slug}/orders`;
}

export function getKitchenQuickNav(user: AuthUser | null | undefined, slug: string) {
  return getVisibleNav(user)
    .filter((item) => item.href !== 'kitchen')
    .map((item) => ({
      href: `/${slug}/${item.href}`,
      label: item.label,
      icon: item.icon,
    }));
}

export function canPrefetchMenu(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, ['menu.manage', 'orders.view', 'orders.create', 'orders.serve']);
}

export function canPrefetchOrders(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, [
    'orders.view',
    'orders.manage',
    'orders.serve',
    'kitchen.manage',
    'delivery.view',
    'delivery.manage',
  ]);
}

export function canPrefetchFloorTables(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, [
    'floor.manage',
    'floor.view',
    'orders.serve',
    'orders.view',
    'orders.manage',
  ]);
}
