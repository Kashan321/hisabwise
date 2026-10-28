'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  canAccessTenantRoute,
  getDefaultRoute,
  getVisibleNav,
  hasAnyPermission,
  isChefOnly,
  isRiderOnly,
  isWaiterOnly,
} from '@/lib/auth/permissions';
import { APP_NAME } from '@/lib/config';
import { businessTabAbbreviation, resolveTenantPageTitle } from '@/lib/document-title';
import { useTenantDocumentTitle } from '@/lib/hooks/use-document-title';
import { useBusiness, useCurrentCashShift, useSubscription } from '@/lib/hooks/queries';
import { usePrefetchTenantShell } from '@/lib/hooks/prefetch-tenant-shell';
import { useAutoDetectCurrency } from '@/lib/hooks/use-auto-detect-currency';
import { themeToStyle } from '@/lib/theme/theme-css';
import {
  BusinessDayLifecycleMonitor,
  BusinessDayNoticeBanner,
} from '@/components/business-day/business-day-notice-banner';
import { BusinessDayPowerButton } from '@/components/business-day/business-day-controls';
import { ShiftPowerButton } from '@/components/cash-shift/shift-controls';
import { Icon, NavLink } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/modal';
import { SubscriptionLockScreen } from '@/components/subscription/subscription-lock-screen';
import { InboxRealtimeBridge } from '@/components/notifications/inbox-realtime-bridge';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SubscriptionNoticeBanner } from '@/components/subscription/subscription-notice-banner';
import { MobileNavSheet } from '@/components/layouts/mobile-nav-sheet';
import { TenantPageFrame } from '@/components/layouts/tenant-page-frame';
import { NewBillButton } from '@/components/layouts/new-bill-button';
import { ReportsButton } from '@/components/layouts/reports-button';
import { UserProfileMenu } from '@/components/layouts/user-profile-menu';

const HEADER_LINKS = [
  { label: 'Analytics', href: 'reports', permissions: ['reports.view'] },
  { label: 'Inventory', href: 'inventory', permissions: ['inventory.view', 'inventory.manage'] },
  { label: 'Staff', href: 'staff', permissions: ['staff.manage'] },
];

const MOBILE_PRIMARY_NAV = [
  { href: 'dashboard', icon: 'home', label: 'Home', permissions: ['orders.manage', 'reports.view', '*'] },
  { href: 'orders', icon: 'receipt_long', label: 'Orders', permissions: ['orders.view', 'orders.manage'] },
  { href: 'kitchen', icon: 'skillet', label: 'Kitchen', permissions: ['kitchen.manage'] },
  { href: 'menu', icon: 'restaurant_menu', label: 'Menu', permissions: ['menu.manage'] },
] as const;

const SIDEBAR_STORAGE_KEY = 'venta-sidebar-open';

function useSidebarOpen(defaultOpen = true) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved !== null) setOpen(saved === 'true');
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
    } catch {
      /* ignore */
    }
  }, [open, hydrated]);

  return { open, setOpen, hydrated };
}

function navItemActive(slug: string, pathname: string, href: string) {
  if (href === 'dashboard') {
    return pathname === `/${slug}/dashboard` || pathname === `/${slug}`;
  }
  return pathname.includes(`/${slug}/${href}`);
}

function TenantBrandMark({
  logoUrl,
  name,
  size = 'md',
}: {
  logoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md';
}) {
  const boxClass =
    size === 'sm'
      ? 'w-9 h-9 rounded-lg'
      : 'w-10 h-10 rounded-lg';

  if (logoUrl) {
    return (
      <div
        className={`${boxClass} shrink-0 overflow-hidden border border-outline-variant/15 bg-surface-container`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${boxClass} shrink-0 bg-primary-container flex items-center justify-center text-on-primary-container`}
      aria-hidden
    >
      <span className="font-display-md text-sm leading-none">
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    </div>
  );
}

export function BusinessLayout({
  slug,
  children,
  title,
  fabHref,
  fullBleed,
  hideFab,
  noPadding,
  showHeaderTitle = false,
  hideTenantBanners = false,
  hideHeaderNavLinks = false,
}: {
  slug: string;
  children: React.ReactNode;
  title?: string;
  fabHref?: string;
  fullBleed?: boolean;
  hideFab?: boolean;
  noPadding?: boolean;
  showHeaderTitle?: boolean;
  /** Full-bleed POS-style pages: hide lifecycle banners and let children fill main height */
  hideTenantBanners?: boolean;
  /** Hide Analytics / Inventory / Staff shortcuts in the top bar (e.g. New Bill POS) */
  hideHeaderNavLinks?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isReady } = useAuth();
  const { data: business } = useBusiness();
  const { data: subscription } = useSubscription();
  const canManageShift = hasAnyPermission(user, ['cash.shift', 'orders.manage', '*']);
  const canManageBusinessDay = hasAnyPermission(user, ['business.manage', 'orders.manage', '*']);
  const { data: currentShift } = useCurrentCashShift({ enabled: canManageShift });
  useAutoDetectCurrency();
  usePrefetchTenantShell(
    isReady && isAuthenticated && user?.businessSlug === slug,
    user,
  );
  const branchName = business?.name ?? slug.replace(/-/g, ' ');
  const productPosLabel = `${businessTabAbbreviation(APP_NAME)} POS`;
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebarOpen(!fullBleed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const sidebarNav = getVisibleNav(user);
  const mobilePrimaryNav = MOBILE_PRIMARY_NAV.filter(
    (item) => !item.permissions || hasAnyPermission(user, [...item.permissions]),
  );
  const headerLinks = HEADER_LINKS.filter(
    (link) => !link.permissions || hasAnyPermission(user, link.permissions),
  );

  const showMobileChrome = !fullBleed;
  const showFab = !hideFab && !fullBleed && hasAnyPermission(user, ['orders.create', 'orders.manage']);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isReady && isAuthenticated && user) {
      if (user.businessSlug !== slug) {
        router.replace(getDefaultRoute(user, user.businessSlug));
        return;
      }
      if (isWaiterOnly(user)) {
        router.replace(`/${slug}/waiter`);
        return;
      }
      if (isRiderOnly(user)) {
        router.replace(`/${slug}/rider`);
        return;
      }
      if (isChefOnly(user)) {
        router.replace(`/${slug}/kitchen`);
        return;
      }
      if (!canAccessTenantRoute(user, slug, pathname)) {
        router.replace(getDefaultRoute(user, slug));
      }
    }
  }, [isReady, isAuthenticated, user, router, slug, pathname]);

  const pageTitle = resolveTenantPageTitle(slug, pathname, title);
  useTenantDocumentTitle(pageTitle, branchName);

  const isSubscriptionRoute = pathname.includes('/subscription');

  if (!isReady || !isAuthenticated || !canAccessTenantRoute(user, slug, pathname)) {
    return null;
  }

  const subscriptionHardLocked =
    subscription?.isLocked ||
    subscription?.accessPhase === 'locked' ||
    subscription?.accessPhase === 'suspended';

  if (subscriptionHardLocked && !isSubscriptionRoute) {
    return (
      <SubscriptionLockScreen slug={slug} subscription={subscription} onLogout={logout} />
    );
  }

  const fabTarget = fabHref ?? `/${slug}/orders/new`;
  const themeStyle = themeToStyle(business);
  const canCreateOrders = hasAnyPermission(user, ['orders.create', 'orders.manage']);
  const canViewReports = hasAnyPermission(user, ['reports.view']);

  const lockViewportHeight = Boolean(fullBleed && hideTenantBanners);

  const mainPaddingClass = fullBleed
    ? 'flex-1 flex flex-col min-h-0 overflow-hidden pb-0 h-full max-h-full'
    : noPadding
      ? `flex-1 ${showMobileChrome ? 'pb-app-shell md:pb-8' : 'pb-4 md:pb-8'}`
      : `flex-1 p-3 md:p-5 lg:p-6 space-y-0 max-w-container-max mx-auto w-full tenant-main-canvas ${
          showMobileChrome
            ? showFab
              ? 'pb-app-shell-with-fab md:pb-8'
              : 'pb-app-shell md:pb-8'
            : 'pb-4 md:pb-8'
        }`;

  return (
    <div
      className="bg-surface text-on-surface min-h-screen min-h-[100dvh] font-body-base antialiased app-shell-bg"
      style={themeStyle}
    >
      <InboxRealtimeBridge slug={slug} />
      <aside
        className={`h-screen h-[100dvh] w-sidebar-width fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant/20 hidden md:flex flex-col p-4 gap-2 z-[60] transition-transform duration-300 ease-in-out pt-safe ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-4 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <TenantBrandMark logoUrl={business?.logoUrl} name={branchName} />
            <div className="min-w-0 flex-1">
              <p className="font-display-md text-primary leading-tight tracking-tight whitespace-nowrap">
                {productPosLabel}
              </p>
              <p className="font-caption text-on-surface-variant truncate" title={branchName}>
                {branchName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="shrink-0 p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors cursor-pointer tap-target"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <Icon name="chevron_left" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {sidebarNav.map((item) => (
            <NavLink
              key={item.href}
              href={`/${slug}/${item.href}`}
              icon={item.icon}
              label={item.label}
              active={navItemActive(slug, pathname, item.href)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-1 pb-safe">
          {canCreateOrders && (
            <Link
              href={`/${slug}/orders/new`}
              className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary py-2.5 rounded-lg font-body-emphasis mb-2 hover:opacity-90 active:scale-[0.98] transition-all tap-target"
            >
              <Icon name="add" className="text-sm" />
              New Order
            </Link>
          )}
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="flex items-center gap-3 w-full p-3 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all duration-200 tap-target"
          >
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <MobileNavSheet
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        slug={slug}
        title={productPosLabel}
        subtitle={branchName}
        logoUrl={business?.logoUrl}
        brandName={branchName}
        items={sidebarNav.map((item) => ({
          href: item.href,
          icon: item.icon,
          label: item.label,
        }))}
        footer={
          <>
            {canCreateOrders && (
              <Link
                href={`/${slug}/orders/new`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary py-2.5 rounded-lg font-body-emphasis mb-2 hover:opacity-90 active:scale-[0.98] transition-all tap-target"
              >
                <Icon name="add" className="text-sm" />
                New Order
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setLogoutConfirmOpen(true);
              }}
              className="flex items-center gap-3 w-full p-3 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all duration-200 tap-target"
            >
              <Icon name="logout" />
              <span>Logout</span>
            </button>
          </>
        }
      />

      <div
        className={`flex flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? 'md:ml-sidebar-width' : 'md:ml-0'
        } ${
          lockViewportHeight
            ? 'h-[100dvh] max-h-[100dvh] overflow-hidden'
            : 'min-h-screen min-h-[100dvh]'
        }`}
      >
        <header
          className={`fixed top-0 right-0 z-50 pt-safe bg-white/95 backdrop-blur-lg border-b border-outline-variant/25 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-[left] duration-300 ease-in-out ${
            sidebarOpen ? 'left-0 md:left-[var(--sidebar-width)]' : 'left-0'
          }`}
        >
          <div className="relative flex h-[var(--app-header-height)] items-center justify-between gap-2 px-5 md:px-8 lg:px-10">
          <div className="relative z-10 flex h-full items-center gap-2 md:gap-3 min-w-0 flex-1 justify-start pointer-events-none">
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia('(min-width: 768px)').matches) {
                  setSidebarOpen(true);
                } else {
                  setMobileMenuOpen(true);
                }
              }}
              className={`pointer-events-auto inline-flex h-8 w-8 -ml-1 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors cursor-pointer tap-target shrink-0 ${
                sidebarOpen ? 'md:hidden' : ''
              }`}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {showHeaderTitle && (
                <h2 className="text-base font-bold text-primary truncate max-w-[40vw] sm:max-w-none">
                  {pageTitle}
                </h2>
              )}
              <nav
                className={`pointer-events-auto hidden lg:flex h-full items-center gap-1 shrink-0 ${
                  hideHeaderNavLinks ? 'lg:hidden' : ''
                }`}
              >
                {headerLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={`/${slug}/${link.href}`}
                    className={`inline-flex h-8 items-center px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      pathname.includes(`/${slug}/${link.href}`)
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
            <div className="pointer-events-auto relative z-20 flex items-center justify-center gap-1.5">
              {canManageBusinessDay && <BusinessDayPowerButton />}
              {canCreateOrders && <NewBillButton slug={slug} />}
              {canManageShift && <ShiftPowerButton />}
              {canViewReports && <ReportsButton slug={slug} />}
            </div>
          </div>

          <div className="relative z-10 flex h-full items-center justify-end gap-2 md:gap-3 min-w-0 flex-1 pointer-events-none">
            <span className="pointer-events-none font-caption text-on-surface-variant hidden sm:block max-w-[120px] truncate">
              {user?.name}
            </span>
            <div className="pointer-events-auto">
              <NotificationBell slug={slug} />
            </div>
            {user && (
              <div className="pointer-events-auto">
                <UserProfileMenu
                  user={user}
                  slug={slug}
                  onLogout={() => setLogoutConfirmOpen(true)}
                />
              </div>
            )}
          </div>
          </div>
        </header>

        <main
          className={`${mainPaddingClass} flex flex-col overflow-x-hidden max-w-full min-w-0 pt-[calc(var(--app-header-height)+env(safe-area-inset-top,0px))]`}
        >
          {fullBleed || noPadding ? (
            <>
              {!hideTenantBanners && (
                <div className="px-0 mb-3 md:mb-4 space-y-3 shrink-0">
                  <BusinessDayLifecycleMonitor />
                  <BusinessDayNoticeBanner slug={slug} />
                  <SubscriptionNoticeBanner slug={slug} subscription={subscription} />
                </div>
              )}
              {children}
            </>
          ) : (
            <div className="mt-10 md:mt-18 flex flex-col gap-4 md:gap-5">
              <BusinessDayLifecycleMonitor />
              <BusinessDayNoticeBanner slug={slug} />
              <SubscriptionNoticeBanner slug={slug} subscription={subscription} />
              <TenantPageFrame>{children}</TenantPageFrame>
            </div>
          )}
        </main>
      </div>

      {showMobileChrome && mobilePrimaryNav.length > 0 && (
        <nav
          className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-stretch px-2 pt-2 pb-safe bg-surface border-t border-outline-variant/10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-[60] rounded-t-2xl"
          style={{ minHeight: 'var(--bottom-nav-height)' }}
        >
          {mobilePrimaryNav.map((item) => {
            const active = navItemActive(slug, pathname, item.href);
            return (
              <Link
                key={item.href}
                href={`/${slug}/${item.href}`}
                className={`flex flex-col items-center justify-center flex-1 min-w-0 px-1 py-1 font-caption tap-target ${
                  active ? 'text-secondary font-bold' : 'text-on-surface-variant'
                }`}
              >
                <Icon name={item.icon} filled={active} className="text-xl" />
                <span className="mt-0.5 text-[10px] leading-tight truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 min-w-0 px-1 py-1 font-caption text-on-surface-variant tap-target"
            aria-label="More navigation"
          >
            <Icon name="apps" className="text-xl" />
            <span className="mt-0.5 text-[10px] leading-tight">More</span>
          </button>
        </nav>
      )}

      {showFab && (
        <div className="fixed bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] right-4 md:bottom-8 md:right-8 z-40">
          <Link
            href={fabTarget}
            className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-[0px_4px_12px_rgba(0,0,0,0.05),0px_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center hover:opacity-90 transition-all active:scale-90 duration-150 tap-target"
            aria-label="New order"
          >
            <Icon name="add" className="text-2xl" />
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          await logout();
          router.push('/login');
        }}
        title="Log out?"
        message={
          currentShift
            ? 'You have an active cash shift. Close your shift before logging out, or you can log out now and leave it open.'
            : `Are you sure you want to log out of ${APP_NAME}?`
        }
        confirmLabel="Log out"
        destructive
      />
    </div>
  );
}
