'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { LandingBrandLogo } from './landing-brand-logo';
import { LANDING_NAV } from './landing-marketing-data';
import { LandingNavLink } from './landing-nav-link';
import { MarketingPrimaryButton } from './landing-ui';

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors ${
        scrolled
          ? 'bg-[var(--landing-canvas)]/95 backdrop-blur-xl border-[var(--landing-border-subtle)]'
          : 'bg-[var(--landing-canvas)]/80 backdrop-blur-xl border-[var(--landing-border-subtle)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-12 h-16 flex items-center justify-between gap-4">
        <LandingBrandLogo size="md" />

        <nav className="hidden md:flex items-center gap-8">
          {LANDING_NAV.map((item) => (
            <LandingNavLink
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[var(--landing-text-dim)] hover:text-[var(--landing-text)] transition-colors"
            >
              {item.label}
            </LandingNavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline text-sm font-medium text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]"
          >
            Log in
          </Link>
          <MarketingPrimaryButton href="/register" className="!px-5 !py-2 !text-sm hidden sm:inline-flex">
            Start free
          </MarketingPrimaryButton>
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-[var(--landing-surface-subtle)]"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[var(--landing-border-subtle)] bg-[var(--landing-canvas)] px-5 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
          {LANDING_NAV.map((item) => (
            <LandingNavLink
              key={item.href}
              href={item.href}
              onNavigate={() => setMenuOpen(false)}
              className="block px-3 py-3 rounded-lg text-sm font-medium hover:bg-[var(--landing-surface-subtle)]"
            >
              {item.label}
            </LandingNavLink>
          ))}
          <div className="pt-3 flex gap-2">
            <Link
              href="/login"
              className="flex-1 py-3 text-center rounded-full border border-[var(--landing-border-subtle)] text-sm font-medium"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="flex-1 py-3 text-center rounded-full bg-[var(--landing-cta)] text-white text-sm font-medium"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
