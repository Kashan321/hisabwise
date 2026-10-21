import { Icon } from '@/components/ui';
import { ARCHETYPES } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

export function ArchetypesSection() {
  return (
    <LandingSection id="solutions" className="py-16 md:py-24">
      <Reveal className="text-center max-w-2xl mx-auto mb-12">
        <Eyebrow>Flexible Architecture</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-1 tracking-tight">
          Built for your service model.
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {ARCHETYPES.map((item, idx) => (
          <Reveal key={item.title} delay={idx * 40}>
            <div className="bg-[var(--landing-surface-raised)] p-6 rounded-xl shadow-sm border border-[var(--landing-border-subtle)] h-full">
              <Icon name={item.icon} className="text-3xl text-[var(--landing-text)] mb-3" />
              <h3 className="text-lg font-semibold text-[var(--landing-text)] mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--landing-text-muted)]">{item.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}
