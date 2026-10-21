import Link from 'next/link';
import { Icon } from '@/components/ui';
import { LandingBrandLogo } from './landing-brand-logo';
import type { LegalDocument } from '@/lib/legal/legal-pages';
import { LandingFooter } from './landing-footer';
import './landing-marketing.css';

export function LegalDocumentLayout({ document }: { document: LegalDocument }) {
  return (
    <div
      className="landing-marketing min-h-screen flex flex-col"
      style={{ fontFamily: 'var(--font-landing), system-ui, sans-serif' }}
    >
      <header className="border-b border-[var(--landing-border-subtle)] bg-[var(--landing-canvas)]">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]">
            <Icon name="arrow_back" className="text-lg" />
            Back to home
          </Link>
          <LandingBrandLogo size="sm" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-10 md:py-14">
        <p className="text-xs text-[var(--landing-text-dim)] mb-2">Last updated: {document.updatedAt}</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] tracking-tight mb-2">
          {document.title}
        </h1>
        <p className="text-[var(--landing-text-muted)] mb-6">{document.description}</p>

        {document.externalCta && (
          <a
            href={document.externalCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 mb-10 px-6 py-3 rounded-full bg-[var(--landing-cta)] text-white text-sm font-medium hover:bg-[var(--landing-cta-hover)] transition-colors"
          >
            {document.externalCta.label}
          </a>
        )}

        <div className="space-y-8 text-[var(--landing-text-muted)] leading-relaxed">
          {document.sections.map((section, idx) => (
            <section key={idx}>
              {section.heading && (
                <h2 className="text-lg font-semibold text-[var(--landing-text)] mb-3">{section.heading}</h2>
              )}
              {section.paragraphs.map((p, i) => (
                <p key={i} className="mb-3 last:mb-0">{p}</p>
              ))}
              {section.list && (
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--landing-border-subtle)] flex flex-wrap gap-4 text-sm">
          <Link href="/legal/terms" className="text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]">
            Terms
          </Link>
          <Link href="/legal/privacy" className="text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]">
            Privacy
          </Link>
          <Link href="/legal/refund" className="text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]">
            Refund
          </Link>
          <Link href="/legal/onboarding" className="text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]">
            Onboarding
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
