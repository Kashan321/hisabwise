import { ONBOARDING_STEPS } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

export function OnboardingSection() {
  return (
    <LandingSection className="py-16 md:py-20 bg-[var(--landing-surface-subtle)]">
      <Reveal className="text-center max-w-2xl mx-auto mb-12">
        <Eyebrow>Seamless Transition</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-1 tracking-tight">
          Live in days, not months.
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {ONBOARDING_STEPS.map((step, idx) => (
          <Reveal key={step.step} delay={idx * 50}>
            <div className="bg-[var(--landing-surface-raised)] p-8 rounded-xl shadow-sm border border-[var(--landing-border-subtle)] h-full">
              <span className="text-3xl font-bold text-[var(--landing-text-dim)]/40 mb-4 block">{step.step}</span>
              <h3 className="text-lg font-semibold text-[var(--landing-text)] mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--landing-text-muted)]">{step.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}
