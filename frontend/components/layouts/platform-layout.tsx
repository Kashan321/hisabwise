'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePlatformAuth } from '@/lib/auth/platform-auth-context';
import { usePlatformSettings } from '@/lib/hooks/queries';
import { themeToStyle } from '@/lib/theme/theme-css';
import { PLATFORM_ADMIN_NAME } from '@/lib/config';
import { formatDocumentTitle, resolvePlatformPageTitle } from '@/lib/document-title';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { Icon } from '@/components/ui';
import { MobileNavSheet } from '@/components/layouts/mobile-nav-sheet';
import { TenantPageFrame } from '@/components/layouts/tenant-page-frame';

const PLATFORM_NAV = [
  { href: '/platform', icon: 'dashboard', label: 'Overview', exact: true },
  { href: '/platform/businesses', icon: 'store', label: 'Tenants' },
  { href: '/platform/tenant-insights', icon: 'insights', label: 'Tenant insights' },
  { href: '/platform/billing', icon: 'payments', label: 'Billing' },
  { href: '/platform/feedback', icon: 'feedback', label: 'Feedback' },
  { href: '/platform/demo-requests', icon: 'event', label: 'Demo requests' },
  { href: '/platform/settings', icon: 'palette', label: 'Appearance' },
  { href: '/platform/menu-gallery', icon: 'collections', label: 'Menu gallery' },
  { href: '/platform/receipts', icon: 'receipt_long', label: 'Receipts' },
  { href: '/platform/admins', icon: 'group', label: 'Platform Staff' },
  { href: '/platform/audit', icon: 'history_edu', label: 'Audit Logs' },
] as const;

function formatRole(role?: string) {
  if (!role) return 'Admin';
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function userSubtitle(name?: string, role?: string, email?: string) {
  const formattedRole = formatRole(role);
  if (email && name?.toLowerCase() === formattedRole.toLowerCase()) return email;
  return formattedRole;
}

function UserAvatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' }) {
  const initial = (name?.trim().charAt(0) ?? 'A').toUpperCase();
  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10';
  return (
    <div
      className={`${dim} rounded-full border border-outline-variant/50 bg-primary-container text-on-primary-container flex items-center justify-center font-body-emphasis shrink-0`}
    >
      {initial}
    </div>
  );
}

function SidebarNavLink({
  href,
  icon,
  label,
  active,
  onDark,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        onDark
          ? active
            ? 'bg-white/15 text-white font-body-emphasis shadow-inner'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
          : active
            ? 'bg-primary text-on-primary font-body-emphasis shadow-sm shadow-primary/20'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <Icon name={icon} filled={active} />
      <span className="font-body-base">{label}</span>
    </Link>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="bg-surface border-hairline w-full max-w-xl shadow-2xl rounded-xl overflow-hidden">
        <div className="flex items-center p-4 border-b border-outline-variant/20">
          <Icon name="search" className="text-secondary mr-3" />
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 font-body-emphasis text-display-md p-0 outline-none"
            placeholder="Type a command or search..."
            autoFocus
          />
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          <div className="px-3 py-2 font-caption text-on-surface-variant uppercase tracking-widest text-[10px]">
            Quick Actions
          </div>
          <Link
            href="/platform/businesses"
            onClick={onClose}
            className="w-full flex items-center gap-3 p-3 hover:bg-surface-container rounded-lg transition-all text-left"
          >
            <Icon name="add_business" />
            <span className="font-body-base">Provision New Business Tenant</span>
          </Link>
          <Link
            href="/platform/audit"
            onClick={onClose}
            className="w-full flex items-center gap-3 p-3 hover:bg-surface-container rounded-lg transition-all text-left"
          >
            <Icon name="security_update" />
            <span className="font-body-base">Review Audit Logs</span>
          </Link>
        </div>
        <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 flex justify-between items-center font-caption text-[11px] text-on-surface-variant">
          <span>
            Select with <kbd className="px-1 border border-outline-variant rounded">Enter</kbd>
          </span>
          <span>
            Close with <kbd className="px-1 border border-outline-variant rounded">ESC</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

export function PlatformLayout({
  children,
  title = 'System Overview',
  hideHeaderTitle = false,
}: {
  children: React.ReactNode;
  title?: string;
  hideHeaderTitle?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isReady } = usePlatformAuth();
  const { data: platformSettings } = usePlatformSettings();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const themeStyle = themeToStyle(platformSettings);

  const closeCommand = useCallback(() => setCommandOpen(false), []);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/platform/login');
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') closeCommand();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeCommand]);

  const documentTitle = title
    ? formatDocumentTitle('Admin', title)
    : resolvePlatformPageTitle(pathname);
  useDocumentTitle(documentTitle);

  if (!isReady || !isAuthenticated) {
    return null;
  }

  return (
    <div
      className="bg-surface text-on-surface font-body-base overflow-hidden min-h-screen app-shell-bg"
      style={themeStyle}
    >
      <CommandPalette open={commandOpen} onClose={closeCommand} />

      <aside className="tenant-sidebar h-screen h-[100dvh] w-sidebar-width fixed left-0 top-0 hidden md:flex flex-col min-h-0 overflow-hidden p-3 gap-1 z-50 pt-safe pb-safe">
        <div className="flex items-center gap-3 mb-4 px-2 py-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
            <Icon name="admin_panel_settings" className="text-lg" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight truncate">{PLATFORM_ADMIN_NAME}</h1>
            <p className="text-white/50 font-caption text-xs">Platform oversight</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-0.5 px-1 -mx-1">
          {PLATFORM_NAV.map((item) => {
            const active = 'exact' in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={active}
                onDark
              />
            );
          })}
        </nav>

        <div className="shrink-0 mt-auto pt-4 border-t border-white/10 space-y-1">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2 text-white/60 hover:bg-white/10 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <Icon name="help" />
            <span className="font-body-base">Admin Support</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/platform/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/60 hover:bg-white/10 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <Icon name="logout" />
            <span className="font-body-base">Logout</span>
          </button>
        </div>
      </aside>

      <MobileNavSheet
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        slug=""
        title={PLATFORM_ADMIN_NAME}
        subtitle="Platform Oversight"
        items={PLATFORM_NAV.map((item) => ({
          href: item.href,
          icon: item.icon,
          label: item.label,
        }))}
        footer={
          <button
            type="button"
            onClick={async () => {
              setMobileMenuOpen(false);
              await logout();
              router.push('/platform/login');
            }}
            className="flex items-center gap-3 w-full p-3 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all duration-200 tap-target"
          >
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        }
      />

      <main className="md:ml-sidebar-width min-h-screen min-h-[100dvh] w-full md:w-[calc(100%-var(--sidebar-width))] flex flex-col overflow-y-auto hide-scrollbar pb-app-shell md:pb-0">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg flex justify-between items-center w-full px-4 md:px-8 py-3 md:py-4 border-b border-outline-variant/20 shrink-0 pt-safe shadow-sm">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low tap-target"
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            {!hideHeaderTitle && (
              <h1 className="font-display-md text-secondary shrink-0">{title}</h1>
            )}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden lg:flex items-center bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant/30 w-80 cursor-text"
            >
              <Icon name="search" className="text-on-surface-variant text-[20px] mr-2" />
              <span className="text-body-base text-on-surface-variant flex-1 text-left">
                Search businesses, users, or logs...
              </span>
              <span className="text-on-surface-variant font-mono text-[10px] ml-2 opacity-50">
                CMD+K
              </span>
            </button>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all cursor-pointer"
            >
              <Icon name="notifications" />
            </button>
            <div className="h-8 w-[1px] bg-outline-variant/30 mx-1" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="font-body-emphasis text-on-surface leading-tight">
                  {user?.name ?? 'Admin Principal'}
                </p>
                <p className="font-caption text-on-surface-variant opacity-70">
                  {userSubtitle(user?.name, user?.role, user?.email)}
                </p>
              </div>
              <UserAvatar name={user?.name} />
            </div>
          </div>
        </header>

        <div className="p-3 md:p-5 lg:p-6 w-full flex-1 tenant-main-canvas">
          <TenantPageFrame>{children}</TenantPageFrame>
        </div>

        <footer className="mt-auto bg-surface border-t border-outline-variant/30 px-4 md:px-8 py-2 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center z-10 pb-safe">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-on-surface-variant text-caption">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-on-tertiary-container" />
              <span>API: stable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-on-tertiary-container" />
              <span>Database: healthy</span>
            </div>
          </div>
          <div className="text-on-surface-variant text-caption flex items-center gap-2">
            <Icon name="update" className="text-[14px]" />
            Last checked: Just now
          </div>
        </footer>
      </main>
    </div>
  );
}
