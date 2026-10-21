'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccessTenantRoute, getDefaultRoute } from '@/lib/auth/permissions';
import { APP_NAME } from '@/lib/config';
import { resolveTenantPageTitle } from '@/lib/document-title';
import { useTenantDocumentTitle } from '@/lib/hooks/use-document-title';
import { useBusiness } from '@/lib/hooks/queries';
import { themeToStyle } from '@/lib/theme/theme-css';
import { Icon } from '@/components/ui';

const WAITER_NAV = [
  { href: 'waiter', icon: 'home', label: 'Home' },
  { href: 'waiter/tables', icon: 'table_restaurant', label: 'Tables' },
  { href: 'waiter/orders', icon: 'receipt_long', label: 'Orders' },
  { href: 'waiter/orders/new', icon: 'add_circle', label: 'New' },
];

export function WaiterLayout({
  slug,
  children,
  title,
  fullScreen,
}: {
  slug: string;
  children: React.ReactNode;
  title?: string;
  fullScreen?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isReady } = useAuth();
  const { data: business } = useBusiness();
  const branchName = business?.name ?? slug.replace(/-/g, ' ');

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isReady && isAuthenticated && user && !canAccessTenantRoute(user, slug, pathname)) {
      router.replace(getDefaultRoute(user, slug));
    }
  }, [isReady, isAuthenticated, user, router, slug, pathname]);

  const pageTitle = resolveTenantPageTitle(slug, pathname, title);
  useTenantDocumentTitle(pageTitle, branchName);

  const isNewOrderPage = pathname.includes('/waiter/orders/new');
  const showBottomNav = !fullScreen || !isNewOrderPage;
  const showWaiterHeader = !fullScreen || !isNewOrderPage;

  if (!isReady || !isAuthenticated || !canAccessTenantRoute(user, slug, pathname)) {
    return null;
  }

  return (
    <div
      className={`bg-surface text-on-surface ${
        fullScreen ? 'h-[100dvh] overflow-hidden flex flex-col' : 'min-h-screen'
      } ${isNewOrderPage && fullScreen ? 'pos-bill-immersive' : ''}`}
      style={themeToStyle(business)}
    >
      {showWaiterHeader && (
      <header className="sticky top-0 z-50 shrink-0 flex justify-between items-center px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
            <Icon name="room_service" filled className="text-sm" />
          </div>
          <div className="min-w-0">
            <h1 className="font-title-lg text-primary truncate">{pageTitle}</h1>
            <p className="font-caption text-on-surface-variant capitalize truncate">{branchName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-caption text-on-surface-variant hidden sm:block">{user?.name}</span>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Logout"
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>
      )}

      <main
        className={
          fullScreen
            ? 'flex-1 min-h-0 overflow-hidden'
            : showBottomNav
              ? 'flex-1 p-4 pb-app-shell max-w-3xl mx-auto w-full'
              : 'flex-1 p-4 max-w-3xl mx-auto w-full'
        }
      >
        {children}
      </main>

      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-stretch px-2 pt-2 pb-safe bg-surface border-t border-outline-variant/10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-[60] rounded-t-2xl" style={{ minHeight: 'var(--bottom-nav-height)' }}>
          {WAITER_NAV.map((item) => {
            const href = `/${slug}/${item.href}`;
            const active =
              item.href === 'waiter'
                ? pathname === href || pathname === `/${slug}/waiter/`
                : pathname.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                className={`flex flex-col items-center justify-center font-caption min-w-[4rem] ${
                  active ? 'text-secondary font-bold' : 'text-on-surface-variant'
                }`}
              >
                <Icon name={item.icon} filled={active} />
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
