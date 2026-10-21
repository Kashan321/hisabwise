'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui';
import { SERVICE_STAGES } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

export function ServiceWalkthroughSection() {
  const [active, setActive] = useState(0);
  const stage = SERVICE_STAGES[active];

  return (
    <LandingSection id="walkthrough" className="py-16 md:py-24">
      <Reveal className="mb-10">
        <Eyebrow>Hospitality Lifecycle</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-2 tracking-tight">
          Engineered for the reality of high-volume service.
        </h2>
      </Reveal>

      <div className="flex gap-2 p-1.5 bg-[var(--landing-surface-subtle)] rounded-xl mb-8 overflow-x-auto">
        {SERVICE_STAGES.map((s, idx) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setActive(idx)}
            className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active === idx
                ? 'bg-[var(--landing-surface-raised)] text-[var(--landing-text)] shadow-sm'
                : 'text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]'
            }`}
          >
            {String(idx + 1).padStart(2, '0')}. {s.title}
          </button>
        ))}
      </div>

      <div className="bg-[var(--landing-surface-raised)] rounded-xl p-6 md:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[360px] border border-[var(--landing-border-subtle)]">
        <div className="lg:col-span-5 space-y-4">
          <span className="lm-font-mono text-xs text-[var(--landing-text-dim)]">{stage.step}</span>
          <h3 className="text-2xl font-semibold text-[var(--landing-text)]">{stage.title}</h3>
          <p className="text-[var(--landing-text-muted)] leading-relaxed">{stage.description}</p>
          <ul className="space-y-2 pt-2 text-sm text-[var(--landing-text-muted)]">
            {stage.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <Icon name="check" className="text-base text-[var(--landing-text)]" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7 bg-[var(--landing-surface-subtle)] p-4 md:p-6 rounded-lg lm-font-mono text-sm">
          <div className="bg-[var(--landing-surface-raised)] p-4 rounded shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 bg-surface-container-high px-2 py-1 rounded text-xs">
              <span className="font-bold text-[var(--landing-text)]">{stage.visualTitle}</span>
              <span className="text-[var(--landing-emerald-text)]">{stage.visualStatus}</span>
            </div>
            <div className="space-y-2">
              {stage.lines.map((line) => (
                <div key={line.name}>
                  <div className="flex justify-between gap-2">
                    <span>{line.name}</span>
                    <span>{line.price}</span>
                  </div>
                  {line.note && (
                    <div className="pl-4 text-xs text-[var(--landing-text-dim)]">↳ {line.note}</div>
                  )}
                </div>
              ))}
            </div>
            {stage.subtotal && (
              <div className="pt-3 flex justify-between font-bold text-[var(--landing-text)] border-t border-[var(--landing-border-subtle)]">
                <span>Subtotal</span>
                <span>{stage.subtotal}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
