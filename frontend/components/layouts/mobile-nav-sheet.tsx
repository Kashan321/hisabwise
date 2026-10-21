'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon, NavLink } from '@/components/ui';

export function MobileNavSheet({
  open,
  onClose,
  slug,
  title,
  subtitle,
  logoUrl,
  brandName,
  items,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  title: string;
  subtitle?: string;
  logoUrl?: string | null;
  brandName?: string;
  items: Array<{ href: string; icon: string; label: string }>;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] md:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="absolute left-0 top-0 bottom-0 w-[min(100%,280px)] bg-surface-container-low border-r border-outline-variant/20 flex flex-col p-4 gap-2 shadow-2xl animate-slide-in-left pt-safe"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between gap-2 px-2 py-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-outline-variant/15 bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : brandName ? (
              <div
                className="w-9 h-9 shrink-0 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-display-md text-sm"
                aria-hidden
              >
                {brandName.trim().charAt(0).toUpperCase()}
              </div>
            ) : null}
            <div className="min-w-0">
              <h2 className="font-display-md text-primary truncate">{title}</h2>
              {subtitle && (
                <p className="font-caption text-on-surface-variant capitalize truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-target shrink-0 rounded-lg text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto -mx-1 px-1">
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href.startsWith('/') ? item.href : `/${slug}/${item.href}`}
              icon={item.icon}
              label={item.label}
              onClick={onClose}
            />
          ))}
        </nav>

        {footer && (
          <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-1 pb-safe">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
