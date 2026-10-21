'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui';
import type { AuthUser } from '@/lib/api/types';
import { hasAnyPermission } from '@/lib/auth/permissions';

export function UserProfileMenu({
  user,
  slug,
  onLogout,
}: {
  user: AuthUser;
  slug: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canAccessSettings = hasAnyPermission(user, ['business.manage', '*']);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const initial = user.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-primary-container border border-primary/15 flex items-center justify-center text-xs text-primary font-bold hover:ring-2 hover:ring-primary/20 transition-all tap-target"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[70] mt-2 w-56 rounded-xl border border-outline-variant/20 bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-outline-variant/10">
            <p className="font-body-emphasis text-sm text-on-surface truncate">{user.name}</p>
            <p className="font-caption text-on-surface-variant text-xs truncate mt-0.5">{user.email}</p>
          </div>

          {canAccessSettings && (
            <Link
              href={`/${slug}/settings`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <Icon name="settings" className="text-lg text-on-surface-variant" />
              Settings
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-container/30 transition-colors"
          >
            <Icon name="logout" className="text-lg" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
