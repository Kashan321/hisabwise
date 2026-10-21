import { Icon } from '@/components/ui';
import { FRAGMENTED_STACK_ITEMS, UNIFIED_ENGINE_ITEMS } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

export function ArchitectureComparisonSection() {
  return (
    <LandingSection className="py-16 md:py-20 bg-[var(--landing-surface-subtle)]">
      <Reveal className="max-w-3xl mb-12">
        <Eyebrow>Operational Architecture</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-2 mb-4 tracking-tight">
          One order shouldn&apos;t require five disconnected systems.
        </h2>
        <p className="text-lg text-[var(--landing-text-muted)]">
          Most restaurant stacks look like a web of manual syncs, lost tickets, and third-party
          tablets. Hisab Wise replaces that with a single state engine.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Reveal>
          <div className="bg-[var(--landing-surface-raised)] p-8 rounded-2xl border border-error-container/60 shadow-sm relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-error/40" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-error">
                <Icon name="error_outline" />
                <span className="font-semibold">The Fragmented Stack</span>
              </div>
              <span className="lm-font-mono text-[10px] uppercase px-2 py-0.5 bg-error-container/40 text-error rounded font-semibold">
                Friction Heavy
              </span>
            </div>
            <p className="text-sm text-[var(--landing-text-muted)] mb-6">
              When software doesn&apos;t talk directly, staff acts as human middleware between tablet
              screens and printers.
            </p>
            <div className="space-y-3 text-sm lm-font-mono">
              {FRAGMENTED_STACK_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="p-3 bg-error-container/20 border border-error-container/40 rounded-lg flex justify-between gap-2"
                >
                  <span>{item.label}</span>
                  <span className="text-error font-medium shrink-0">{item.tag}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--landing-text-dim)] mt-6 flex items-center gap-1.5">
              <Icon name="warning" className="text-error text-sm" />
              High error rates, customer wait bottlenecks, stressed staff.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="bg-[var(--landing-emerald-surface)]/20 p-8 rounded-2xl border border-[var(--landing-emerald-border)] shadow-sm relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--landing-emerald-text)]" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[var(--landing-emerald-text)]">
                <Icon name="check_circle" />
                <span className="font-semibold text-[var(--landing-text)]">The Hisab Wise Unified Engine</span>
              </div>
              <span className="lm-font-mono text-[10px] uppercase px-2 py-0.5 bg-[var(--landing-emerald-surface)] text-[var(--landing-emerald-text)] rounded font-bold border border-[var(--landing-emerald-border)]">
                Atomic Sync
              </span>
            </div>
            <p className="text-sm text-[var(--landing-text-muted)] mb-6">
              A single operational loop where counter, tables, kitchen, and cloud update the database
              simultaneously.
            </p>
            <div className="space-y-3 text-sm lm-font-mono">
              {UNIFIED_ENGINE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="p-3 bg-[var(--landing-surface-raised)] border border-[var(--landing-emerald-border)]/60 rounded-lg flex justify-between gap-2 shadow-sm"
                >
                  <span className="text-[var(--landing-text)]">{item.label}</span>
                  <span className="text-[var(--landing-emerald-text)] font-semibold flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--landing-emerald-text)] animate-pulse" />
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--landing-emerald-text)] font-medium mt-6 flex items-center gap-1.5">
              <Icon name="bolt" className="text-sm" />
              24% faster turnaround, zero ticket loss, transparent real-time margins.
            </p>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}
