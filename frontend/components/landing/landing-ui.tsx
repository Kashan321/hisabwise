'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { APP_DOMAIN } from '@/lib/config';
import { LandingBrandLogo, LANDING_BRAND_NAME } from './landing-brand-logo';
import { LandingNavLink } from './landing-nav-link';

/** Browser-style frame — light chrome, no black device bezel */
export function BrowserFrame({
  src,
  alt,
  className = '',
  priority,
  url = `${APP_DOMAIN}/dashboard`,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  url?: string;
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-200/80 ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex-1 mx-2 h-7 rounded-md bg-white border border-gray-200 flex items-center px-3">
          <Icon name="lock" className="text-gray-400 text-xs mr-1.5" />
          <span className="text-[10px] text-gray-400 truncate font-mono">{url}</span>
        </div>
      </div>
      <Image src={src} alt={alt} width={1200} height={750} className="w-full h-auto block" priority={priority} />
    </div>
  );
}

/** Minimal phone — slim bezel, floating card style */
export function PhoneFrame({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] p-1.5 bg-gradient-to-b from-gray-200 to-gray-300 shadow-xl ${className}`}
    >
      <div className="rounded-[1.75rem] overflow-hidden bg-white ring-1 ring-black/5">
        <Image src={src} alt={alt} width={390} height={844} className="w-full h-auto block" />
      </div>
    </div>
  );
}

export function PrimaryButton({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5 ${className}`}
    >
      {children}
      <Icon name="arrow_forward" className="text-lg" />
    </Link>
  );
}

export function SecondaryButton({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-gray-800 font-semibold text-sm border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all ${className}`}
    >
      {children}
    </Link>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
      {children}
    </span>
  );
}

/** Marketing page eyebrow (main-venta style) */
export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--landing-text-dim)] ${className}`}
    >
      {children}
    </span>
  );
}

const marketingPrimaryClass =
  'inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[var(--landing-cta)] text-white text-sm font-medium hover:bg-[var(--landing-cta-hover)] transition-colors shadow-sm active:scale-[0.98]';

const marketingSecondaryClass =
  'inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[var(--landing-surface-raised)] text-[var(--landing-text)] text-sm font-medium border border-[var(--landing-border-subtle)] hover:bg-[var(--landing-surface-subtle)] transition-colors shadow-sm';

export function MarketingPrimaryButton({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classNames = `${marketingPrimaryClass} ${className}`;
  if (href.startsWith('#')) {
    return (
      <LandingNavLink href={href} className={classNames}>
        {children}
      </LandingNavLink>
    );
  }
  return (
    <Link href={href} className={classNames}>
      {children}
    </Link>
  );
}

export function MarketingSecondaryButton({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classNames = `${marketingSecondaryClass} ${className}`;
  if (href.startsWith('#')) {
    return (
      <LandingNavLink href={href} className={classNames}>
        {children}
      </LandingNavLink>
    );
  }
  return (
    <Link href={href} className={classNames}>
      {children}
    </Link>
  );
}

export function LandingSection({
  id,
  children,
  className = '',
  innerClassName = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <section id={id} className={`w-full ${className}`}>
      <div className={`max-w-7xl mx-auto px-5 lg:px-12 ${innerClassName}`}>{children}</div>
    </section>
  );
}

export function AuthMarketingPanel() {
  const highlights = [
    { icon: 'receipt_long', text: 'POS for dine-in, takeaway & delivery' },
    { icon: 'qr_code_2', text: 'QR ordering at every table' },
    { icon: 'skillet', text: 'Real-time kitchen display' },
    { icon: 'two_wheeler', text: 'Waiter & rider workflows' },
    { icon: 'analytics', text: 'Sales reports & invoices' },
  ];

  return (
    <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#0c1222] text-white p-12 xl:p-16 flex-col justify-between">
      <div className="absolute inset-0 landing-auth-grid opacity-40" aria-hidden />
      <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/3" aria-hidden />
      <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full bg-secondary/15 blur-[80px] translate-y-1/3 -translate-x-1/4" aria-hidden />

      <div className="relative z-10">
        <div className="mb-16 rounded-xl bg-white px-4 py-3 inline-flex">
          <LandingBrandLogo size="lg" />
        </div>

        <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight max-w-md mb-6">
          Run your restaurant from one{' '}
          <span className="text-primary">connected</span> platform
        </h1>
        <p className="text-white/55 text-lg max-w-sm leading-relaxed">
          Orders, kitchen, floor plan, delivery, staff roles, and guest QR — built for modern
          hospitality teams.
        </p>
      </div>

      <ul className="relative z-10 space-y-4 mt-12">
        {highlights.map((item) => (
          <li key={item.text} className="flex items-center gap-3 text-sm text-white/75">
            <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Icon name={item.icon} className="text-primary text-lg" />
            </span>
            {item.text}
          </li>
        ))}
      </ul>

      <p className="relative z-10 text-xs text-white/30 mt-12">
        © {new Date().getFullYear()} {LANDING_BRAND_NAME}. Secure multi-tenant SaaS.
      </p>
    </div>
  );
}
