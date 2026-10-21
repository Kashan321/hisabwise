import { BUSINESS_NAV, getTenantSubPath } from '@/lib/auth/permissions';
import { REPORT_LINKS, REPORT_META } from '@/components/reports/reports-nav';

/** Short prefix for browser tabs, e.g. "Happy Wings" → "HW". */
export function businessTabAbbreviation(businessName: string): string {
  const trimmed = businessName.trim();
  if (!trimmed) return '—';

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }

  const word = words[0]!;
  if (word.length <= 3) return word.toUpperCase();
  return word.slice(0, 2).toUpperCase();
}

export function formatDocumentTitle(prefix: string, pageTitle: string): string {
  const page = pageTitle.trim() || 'Dashboard';
  const abbr = prefix.trim() || '—';
  return `${abbr} | ${page}`;
}

const TENANT_PAGE_FALLBACKS: Record<string, string> = {
  dashboard: 'Dashboard',
  subscription: 'Subscription',
  notifications: 'Notifications',
  'orders/new': 'New Order',
  kitchen: 'Kitchen',
  terminal: 'Terminal',
  'waiter/orders/new': 'New Order',
};

function resolveReportsPageTitle(subPath: string): string {
  if (subPath === 'reports') return 'Reports';

  const rest = subPath.startsWith('reports/') ? subPath.slice('reports/'.length) : '';
  const segment = rest.split('/')[0] ?? '';
  if (!segment) return 'Reports';

  const link = REPORT_LINKS.find((l) => l.id === segment);
  if (link && link.id !== '') return `Reports · ${link.label}`;

  const meta = REPORT_META[segment];
  if (meta?.title) return meta.title;

  return 'Reports';
}

/** Tab label for tenant routes under `/[slug]/…`. */
export function resolveTenantPageTitle(
  slug: string,
  pathname: string,
  explicitTitle?: string,
): string {
  if (explicitTitle?.trim()) return explicitTitle.trim();

  const subPath = getTenantSubPath(slug, pathname);

  if (subPath === 'reports' || subPath.startsWith('reports/')) {
    return resolveReportsPageTitle(subPath);
  }

  if (TENANT_PAGE_FALLBACKS[subPath]) {
    return TENANT_PAGE_FALLBACKS[subPath];
  }

  const sortedNav = [...BUSINESS_NAV].sort((a, b) => b.href.length - a.href.length);
  for (const item of sortedNav) {
    if (subPath === item.href || subPath.startsWith(`${item.href}/`)) {
      if (item.href === 'dashboard') return 'Dashboard';
      return item.label;
    }
  }

  if (subPath.startsWith('notifications/')) return 'Message';
  if (subPath.startsWith('orders/') && subPath !== 'orders/new') return 'Order';

  return TENANT_PAGE_FALLBACKS.dashboard;
}

const PLATFORM_TITLES: { prefix: string; titles: Record<string, string> } = {
  prefix: 'Admin',
  titles: {
    '/platform': 'Overview',
    '/platform/businesses': 'Tenants',
    '/platform/tenant-insights': 'Tenant insights',
    '/platform/billing': 'Billing',
    '/platform/feedback': 'Feedback',
    '/platform/demo-requests': 'Demo requests',
    '/platform/settings': 'Appearance',
    '/platform/menu-gallery': 'Menu gallery',
    '/platform/receipts': 'Receipts',
    '/platform/admins': 'Platform Staff',
    '/platform/audit': 'Audit Logs',
    '/platform/login': 'Login',
  },
};

export function resolvePlatformPageTitle(pathname: string): string {
  const normalized =
    pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  const exact = PLATFORM_TITLES.titles[normalized];
  if (exact) return formatDocumentTitle(PLATFORM_TITLES.prefix, exact);

  for (const [path, title] of Object.entries(PLATFORM_TITLES.titles)) {
    if (path !== '/platform' && normalized.startsWith(`${path}/`)) {
      return formatDocumentTitle(PLATFORM_TITLES.prefix, title);
    }
  }

  return formatDocumentTitle(PLATFORM_TITLES.prefix, 'Platform');
}
