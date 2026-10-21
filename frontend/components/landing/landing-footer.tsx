import Link from 'next/link';
import { APP_COMPANY } from '@/lib/config';
import { LandingBrandLogo } from './landing-brand-logo';
import { FOOTER_COLUMNS } from './landing-marketing-data';
import { LandingNavLink } from './landing-nav-link';
import { NasmakAttribution } from './nasmak-attribution';
import { LandingSection } from './landing-ui';

function FooterHref({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  if (href.startsWith('/#')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  if (href.startsWith('#')) {
    return (
      <LandingNavLink href={href} className={className}>
        {children}
      </LandingNavLink>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function LandingFooter() {
  return (
    <footer className="w-full bg-[var(--landing-surface-subtle)] border-t border-[var(--landing-border-subtle)]">
      <LandingSection innerClassName="py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[var(--landing-border-subtle)]">
          <div className="md:col-span-4 flex flex-col gap-4">
            <LandingBrandLogo size="sm" />
            <p className="text-sm text-[var(--landing-text-muted)] leading-relaxed max-w-sm">
              Multi-tenant restaurant OS — POS, kitchen display, table management, delivery, and
              real-time operations.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/about"
                className="font-medium text-[var(--landing-text)] hover:underline underline-offset-2 w-fit"
              >
                About Hisab Wise
              </Link>
              <Link
                href="/legal/status"
                className="inline-flex items-center gap-2 text-xs font-medium text-[var(--landing-emerald-text)] w-fit"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--landing-emerald-text)]" />
                All systems operational
              </Link>
            </div>
          </div>
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--landing-text-dim)]">
                  {col.title}
                </span>
                <ul className="flex flex-col gap-2 text-sm text-[var(--landing-text-muted)]">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterHref href={link.href} className="hover:text-[var(--landing-text)] transition-colors">
                        {link.label}
                      </FooterHref>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-10 pb-8 flex justify-center border-b border-[var(--landing-border-subtle)]">
          <NasmakAttribution variant="footer-inline" />
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--landing-text-dim)]">
          <p>© {new Date().getFullYear()} {APP_COMPANY} All rights reserved.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm justify-center sm:justify-end">
            <Link href="/register" className="hover:text-[var(--landing-text)]">Register</Link>
            <Link href="/login" className="hover:text-[var(--landing-text)]">Log in</Link>
            <FooterHref href="/#pricing" className="hover:text-[var(--landing-text)]">Pricing</FooterHref>
            <Link href="/about" className="hover:text-[var(--landing-text)]">About</Link>
          </div>
        </div>
      </LandingSection>
    </footer>
  );
}
