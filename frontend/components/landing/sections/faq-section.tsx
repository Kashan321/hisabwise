'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui';
import { MARKETING_FAQ } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <LandingSection id="faq" className="py-16 md:py-20 bg-[var(--landing-surface-subtle)]">
      <Reveal className="text-center mb-12">
        <Eyebrow>Clarity</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-1 tracking-tight">
          Frequently asked questions
        </h2>
      </Reveal>
      <div className="max-w-3xl mx-auto space-y-3">
        {MARKETING_FAQ.map((item, idx) => {
          const isOpen = open === idx;
          return (
            <Reveal key={item.q} delay={idx * 30}>
              <div className="bg-[var(--landing-surface-raised)] rounded-xl shadow-sm overflow-hidden border border-[var(--landing-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="w-full p-5 md:p-6 text-left flex justify-between items-center gap-4"
                >
                  <span className="font-semibold text-[var(--landing-text)]">{item.q}</span>
                  <Icon
                    name={isOpen ? 'expand_less' : 'expand_more'}
                    className="text-[var(--landing-text-dim)] shrink-0"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 md:px-6 pb-5 md:pb-6 text-sm text-[var(--landing-text-muted)] leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </LandingSection>
  );
}
