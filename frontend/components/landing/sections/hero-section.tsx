import { Icon } from '@/components/ui';
import { APP_DOMAIN, APP_NAME } from '@/lib/config';
import { Eyebrow, LandingSection, MarketingPrimaryButton, MarketingSecondaryButton } from '../landing-ui';
import { Reveal } from '../reveal';

function LiveDot({ pulse = false }: { pulse?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {pulse && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--landing-emerald-border)] opacity-75" />
      )}
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--landing-emerald-text)]" />
    </span>
  );
}

export function HeroSection() {
  return (
    <LandingSection id="product" className="pt-28 pb-16 lg:pb-24" innerClassName="overflow-hidden">
      <Reveal className="flex flex-col items-center text-center max-w-4xl mx-auto">
        <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-[var(--landing-surface-subtle)] px-4 py-1.5 rounded-full mb-6">
          <LiveDot pulse />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--landing-text)]">
            {APP_NAME} · Live Engine Connected
          </span>
          <span className="text-[10px] lm-font-mono bg-[var(--landing-emerald-surface)] text-[var(--landing-emerald-text)] px-2 py-0.5 rounded-full border border-[var(--landing-emerald-border)]">
            99.99% Uptime
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold leading-tight tracking-tight text-[var(--landing-text)] mb-6">
          Run the whole restaurant <br className="hidden sm:inline" />
          from one system.
        </h1>
        <p className="text-lg text-[var(--landing-text-muted)] max-w-2xl mb-10 leading-relaxed">
          {APP_NAME} connects your counter, kitchen, tables, QR ordering, delivery, and team into one
          real-time platform. Zero fragmentation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <MarketingPrimaryButton href="#pricing">
            Start free trial
            <Icon name="arrow_forward" className="text-base" />
          </MarketingPrimaryButton>
          <MarketingSecondaryButton href="#walkthrough">
            <Icon name="play_circle" className="text-lg" />
            See how it works
          </MarketingSecondaryButton>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="w-full bg-[var(--landing-surface-raised)] rounded-xl shadow-xl overflow-hidden border border-[var(--landing-border-subtle)]">
          <div className="h-11 bg-[var(--landing-surface-subtle)] px-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--landing-border-strong)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--landing-border-strong)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--landing-border-strong)]" />
              <span className="ml-2 lm-font-mono text-xs text-[var(--landing-text-dim)] flex items-center gap-1 truncate">
                <Icon name="lock" className="text-sm" />
                {APP_DOMAIN}/live-feed
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs lm-font-mono text-[var(--landing-text-dim)]">
              <span className="w-2 h-2 rounded-full bg-[var(--landing-emerald-border)]" />
              Downtown Bistro — Main Hall
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-container-low px-4 md:px-6 py-3">
            {[
              { label: 'Active Tables', value: '14', sub: '/ 18 floor', badge: '78% Full' },
              { label: 'Kitchen Load', value: '8 Tickets', sub: '(6m avg)', badge: 'Paced', pulse: true },
              { label: 'Riders Active', value: '3 En Route', badge: 'GPS Sync' },
              { label: 'Shift Revenue', value: 'PKR 1.34M', badge: '+18.4%', highlight: true },
            ].map((tile) => (
              <div
                key={tile.label}
                className={`p-3 rounded-lg border shadow-sm flex items-center justify-between gap-2 ${
                  tile.highlight
                    ? 'bg-[var(--landing-emerald-surface)]/60 border-[var(--landing-emerald-border)]/60'
                    : 'bg-[var(--landing-surface-raised)] border-[var(--landing-border-subtle)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {tile.pulse ? (
                      <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                    ) : (
                      <LiveDot />
                    )}
                    <span className="text-[10px] uppercase text-[var(--landing-text-dim)] tracking-wider">
                      {tile.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--landing-text)] mt-0.5 truncate">
                    {tile.value}{' '}
                    {tile.sub && <span className="text-xs font-normal text-[var(--landing-text-dim)]">{tile.sub}</span>}
                  </p>
                </div>
                <span className="text-[11px] lm-font-mono px-2 py-0.5 rounded bg-[var(--landing-surface-subtle)] shrink-0">
                  {tile.badge}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 p-4 md:p-6 gap-4 md:gap-6 bg-[var(--landing-canvas)]">
            <TerminalPanel title="Counter POS · Order #1042" tag="Table 07" variant="default">
              <div className="space-y-2 text-sm">
                {[
                  ['Truffle Ribeye Steak', 'PKR 13,440', 'Medium Rare · Rosemary Butter'],
                  ['Burrata Caprese Salad', 'PKR 5,180', '+ Extra Aged Balsamic'],
                  ['2× San Pellegrino (750ml)', 'PKR 4,480', 'Chilled with lime slice'],
                ].map(([name, price, note]) => (
                  <div key={name} className="flex justify-between gap-2 p-2 rounded hover:bg-[var(--landing-surface-subtle)]">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--landing-text)]">{name}</p>
                      <p className="lm-font-mono text-xs text-[var(--landing-text-dim)]">{note}</p>
                    </div>
                    <span className="lm-font-mono text-xs font-semibold shrink-0">{price}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 mt-4 p-3 rounded-xl bg-surface-container-high/60 border border-[var(--landing-border-subtle)]">
                <div className="flex justify-between font-semibold mb-3">
                  <span>Total Payable</span>
                  <span className="text-lg">PKR 23,100</span>
                </div>
                <button type="button" className="w-full bg-[var(--landing-cta)] text-white text-sm py-2.5 rounded-lg flex items-center justify-center gap-2">
                  <Icon name="send" className="text-base" />
                  Fire to Kitchen
                </button>
              </div>
            </TerminalPanel>

            <TerminalPanel title="KDS · Grill Station" tag="#1042 · 4m ago" variant="kitchen">
              <div className="space-y-2 text-sm">
                <div className="p-2.5 rounded-lg bg-[var(--landing-surface-subtle)] border flex gap-2">
                  <input type="checkbox" checked readOnly className="mt-1 accent-[var(--landing-cta)]" aria-hidden />
                  <div>
                    <p className="font-medium">Truffle Ribeye Steak</p>
                    <span className="inline-block bg-secondary-fixed text-on-secondary-container px-2 py-0.5 rounded text-[11px] mt-1">
                      Medium Rare
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--landing-surface-subtle)] border flex gap-2">
                  <input type="checkbox" readOnly className="mt-1" aria-hidden />
                  <div>
                    <p className="font-medium">Burrata Caprese Salad</p>
                    <span className="text-[11px] text-[var(--landing-text-dim)]">Station: Cold Bar</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-4 flex gap-2">
                <button type="button" className="flex-1 py-2.5 rounded-lg border text-sm font-medium bg-[var(--landing-surface-subtle)]">
                  Recall
                </button>
                <button type="button" className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[var(--landing-emerald-text)] text-white flex items-center justify-center gap-1">
                  <Icon name="check" className="text-base" />
                  Mark Ready
                </button>
              </div>
            </TerminalPanel>

            <TerminalPanel title="Floor Status · Table 07" tag="Occupied" variant="floor">
              <div className="space-y-2 text-sm">
                {[
                  ['Assigned Server', 'Marco R.'],
                  ['Guests Seated', '2 Guests'],
                  ['Course Status', 'Mains Cooking'],
                  ['QR Mobile Order', 'Active & Linked'],
                ].map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex justify-between py-1.5 px-2.5 rounded-lg ${
                      i === 3 ? 'bg-[var(--landing-emerald-surface)]/40 border border-[var(--landing-emerald-border)]/40' : 'bg-surface-container-low'
                    }`}
                  >
                    <span className="text-[var(--landing-text-dim)]">{k}</span>
                    <span className="font-medium lm-font-mono text-xs">{v}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 mt-4 p-3 rounded-xl border bg-[var(--landing-surface-subtle)] flex justify-between items-center text-xs lm-font-mono text-[var(--landing-text-dim)]">
                <span>Audit sync: 12ms latency</span>
                <span className="text-[var(--landing-emerald-text)] font-medium">Continuous</span>
              </div>
            </TerminalPanel>
          </div>
        </div>
      </Reveal>
    </LandingSection>
  );
}

function TerminalPanel({
  title,
  tag,
  variant,
  children,
}: {
  title: string;
  tag: string;
  variant: 'default' | 'kitchen' | 'floor';
  children: React.ReactNode;
}) {
  const headerClass =
    variant === 'kitchen'
      ? 'bg-secondary-fixed/50 border-secondary-fixed'
      : variant === 'floor'
        ? 'bg-[var(--landing-emerald-surface)]/70 border-[var(--landing-emerald-border)]/50'
        : 'bg-[var(--landing-surface-subtle)] border-[var(--landing-border-subtle)]';

  const borderClass =
    variant === 'kitchen'
      ? 'border-secondary-fixed/80'
      : variant === 'floor'
        ? 'border-[var(--landing-emerald-border)]/70'
        : 'border-[var(--landing-border-subtle)]';

  return (
    <div
      className={`bg-[var(--landing-surface-raised)] p-4 md:p-5 rounded-xl border shadow-sm flex flex-col ${borderClass}`}
    >
      <div className={`flex items-center justify-between p-2.5 rounded-lg border mb-3 ${headerClass}`}>
        <span className="text-sm font-semibold truncate">{title}</span>
        <span className="text-[11px] lm-font-mono bg-[var(--landing-surface-raised)] px-2 py-0.5 rounded border shrink-0">
          {tag}
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-between">{children}</div>
    </div>
  );
}
