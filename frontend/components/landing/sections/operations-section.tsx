import { Icon } from '@/components/ui';
import { OPERATIONS_CARDS } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

export function OperationsSection() {
  return (
    <LandingSection id="operations" className="py-16 md:py-20 bg-[var(--landing-surface-subtle)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
        <Reveal>
          <Eyebrow>Telemetry & Sync</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-1 tracking-tight">
            Everything changes together.
          </h2>
        </Reveal>
        <Reveal delay={60}>
          <p className="text-[var(--landing-text-muted)] max-w-md">
            Whether placed by a customer over QR, entered by a server, or dispatched to a delivery
            rider, all queues update atomically.
          </p>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {OPERATIONS_CARDS.map((card, idx) => (
          <Reveal key={card.title} delay={idx * 50}>
            <div className="bg-[var(--landing-surface-raised)] p-6 rounded-xl shadow-sm border border-[var(--landing-border-subtle)] h-full">
              <div className="w-10 h-10 rounded-lg bg-[var(--landing-surface-subtle)] flex items-center justify-center mb-4">
                <Icon name={card.icon} className="text-[var(--landing-text)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--landing-text)] mb-2">{card.title}</h3>
              <p className="text-sm text-[var(--landing-text-muted)] mb-4">{card.description}</p>
              <div className="space-y-2 text-xs lm-font-mono bg-[var(--landing-surface-subtle)] p-3 rounded">
                {card.rows.map((row) => (
                  <div key={row.left} className="flex justify-between gap-2">
                    <span>{row.left}</span>
                    <span
                      className={
                        row.tone === 'emerald'
                          ? 'text-[var(--landing-emerald-text)] font-semibold'
                          : row.tone === 'secondary'
                            ? 'text-secondary font-semibold'
                            : 'font-semibold text-[var(--landing-text)]'
                      }
                    >
                      {row.right}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}
