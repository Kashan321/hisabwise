import { ANALYTICS_KPIS, PAYMENT_MIX } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

export function AnalyticsSection() {
  return (
    <LandingSection id="analytics" className="py-16 md:py-20 bg-[var(--landing-surface-subtle)]">
      <Reveal className="max-w-3xl mb-12">
        <Eyebrow>Decision Intelligence</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-1 tracking-tight">
          Know what&apos;s happening before the shift ends.
        </h2>
        <p className="text-lg text-[var(--landing-text-muted)] mt-2">
          Track hourly turn velocity, kitchen bottlenecks, and item margins live — not after month-end
          close.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
        {ANALYTICS_KPIS.map((kpi, idx) => (
          <Reveal key={kpi.label} delay={idx * 40}>
            <div className="bg-[var(--landing-surface-raised)] p-6 rounded-xl shadow-sm border border-[var(--landing-border-subtle)]">
              <span className="text-xs text-[var(--landing-text-dim)] uppercase font-semibold">{kpi.label}</span>
              <p className="text-2xl md:text-3xl font-bold text-[var(--landing-text)] mt-2 mb-1 tabular-nums">
                {kpi.value}
              </p>
              <span
                className={`text-xs lm-font-mono ${
                  kpi.subTone === 'emerald' ? 'text-[var(--landing-emerald-text)] font-medium' : 'text-[var(--landing-text-dim)]'
                }`}
              >
                {kpi.sub}
              </span>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="bg-[var(--landing-surface-raised)] p-6 md:p-8 rounded-xl shadow-sm border border-[var(--landing-border-subtle)]">
          <h3 className="text-lg font-semibold text-[var(--landing-text)] mb-6">
            Payment Distribution & Channel Contribution
          </h3>
          <div className="space-y-4">
            {PAYMENT_MIX.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs font-medium text-[var(--landing-text-muted)] mb-1.5 gap-2">
                  <span>{row.label}</span>
                  <span className="lm-font-mono shrink-0">{row.amount}</span>
                </div>
                <div className="w-full h-3 bg-[var(--landing-surface-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--landing-cta)] rounded-full"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </LandingSection>
  );
}
