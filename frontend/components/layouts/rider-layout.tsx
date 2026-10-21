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

const RIDER_NAV = [
  { href: 'rider', icon: 'home', label: 'Home' },
];

export function RiderLayout({
  slug,
  children,
  title,
}: {
  slug: string;
  children: React.ReactNode;
  title?: string;
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

  const pageTitle = resolveTenantPageTitle(slug, pathname, title ?? 'My Deliveries');
  useTenantDocumentTitle(pageTitle, branchName);

  if (!isReady || !isAuthenticated || !canAccessTenantRoute(user, slug, pathname)) {
    return null;
  }

  return (
    <div
      className="bg-surface text-on-surface min-h-screen flex flex-col"
      style={themeToStyle(business)}
    >
      <header className="shrink-0 flex justify-between items-center px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
            <Icon name="two_wheeler" filled className="text-sm" />
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

      <main className="flex-1 p-4 pb-28 max-w-3xl mx-auto w-full">{children}</main>

      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 pb-safe bg-surface border-t border-outline-variant/10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-[60]">
        {RIDER_NAV.map((item) => {
          const href = `/${slug}/${item.href}`;
          const active = pathname === href || pathname === `/${slug}/rider/`;
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
    </div>
  );
}
