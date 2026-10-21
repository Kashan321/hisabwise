import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { APP_NAME, APP_TAGLINE } from '@/lib/config';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { LandingSection } from './landing-ui';
import './landing-marketing.css';

const NASMAK_URL = 'https://www.nasmaklabs.com';
const NASMAK_CAREERS = 'https://www.nasmaklabs.com/careers';

export function AboutPage() {
  return (
    <div
      className="landing-marketing min-h-screen flex flex-col"
      style={{ fontFamily: 'var(--font-landing), system-ui, sans-serif' }}
    >
      <LandingHeader />
      <main className="flex-1 pt-8 pb-4">
        <LandingSection innerClassName="py-12 md:py-16 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--landing-text-dim)] mb-3">
            Company
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold text-[var(--landing-text)] tracking-tight mb-4">
            About {APP_NAME}
          </h1>
          <p className="text-lg text-[var(--landing-text-muted)] leading-relaxed mb-10">
            {APP_TAGLINE}. We help cafes and restaurants run counter, kitchen, floor, delivery, and
            guest ordering from one connected platform.
          </p>

          <div className="space-y-6 text-[var(--landing-text-muted)] leading-relaxed mb-12">
            <section>
              <h2 className="text-lg font-semibold text-[var(--landing-text)] mb-2">What {APP_NAME} does</h2>
              <p>
                {APP_NAME} is a multi-tenant restaurant operating system: point of sale, kitchen display
                (KDS), visual floor plans and table service, QR menus, delivery and rider workflows,
                staff roles, inventory-aware ordering, and real-time analytics — scoped securely per
                business.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-[var(--landing-text)] mb-2">Who we serve</h2>
              <p>
                Independent restaurants, cafés, fast casual, fine dining, multi-location groups, and
                cloud kitchens that want one source of truth for orders and operations instead of
                disconnected tablets and spreadsheets.
              </p>
            </section>
          </div>

          <div className="rounded-2xl border border-[var(--landing-border-subtle)] bg-[var(--landing-surface-raised)] p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <a
                href={NASMAK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center justify-center md:justify-start px-4 py-3 rounded-xl bg-[var(--landing-surface-subtle)] border border-[var(--landing-border-subtle)]"
                aria-label="Nasmak Labs"
              >
                <Image
                  src="/landing/nasmak-logo.webp"
                  alt="Nasmak Labs"
                  width={160}
                  height={44}
                  className="h-10 w-auto object-contain"
                />
              </a>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--landing-text)] mb-2">
                  A product of Nasmak Labs
                </p>
                <p className="text-sm text-[var(--landing-text-muted)] leading-relaxed mb-4">
                  {APP_NAME} is designed and maintained by{' '}
                  <a
                    href={NASMAK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--landing-text)] font-medium hover:underline underline-offset-2"
                  >
                    Nasmak Labs (SMC-Private) Limited
                  </a>
                  — a strategy-led software studio building purposeful digital products across apps,
                  AI, UI/UX, and product consulting.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={NASMAK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--landing-text)] hover:underline underline-offset-2"
                  >
                    Visit nasmaklabs.com
                    <Icon name="open_in_new" className="text-base" />
                  </a>
                  <a
                    href={NASMAK_CAREERS}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--landing-emerald-text)] hover:underline underline-offset-2"
                  >
                    Careers at Nasmak Labs
                    <Icon name="open_in_new" className="text-base" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {[
              { label: 'System status', href: '/legal/status', icon: 'monitor_heart' },
              { label: 'Security', href: '/legal/security', icon: 'shield' },
              { label: 'Book a demo', href: '/#demo', icon: 'event' },
              { label: 'Contact via demo form', href: '/#demo', icon: 'mail' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 p-4 rounded-xl border border-[var(--landing-border-subtle)] bg-[var(--landing-surface-raised)] text-sm font-medium text-[var(--landing-text-muted)] hover:text-[var(--landing-text)] hover:border-[var(--landing-border-strong)] transition-colors"
              >
                <Icon name={item.icon} className="text-[var(--landing-text)]" />
                {item.label}
              </Link>
            ))}
          </div>
        </LandingSection>
      </main>
      <LandingFooter />
    </div>
  );
}
