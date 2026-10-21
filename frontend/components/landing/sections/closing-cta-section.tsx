import { Icon } from '@/components/ui';
import { APP_NAME } from '@/lib/config';
import { LandingNavLink } from '../landing-nav-link';
import { LandingSection, MarketingPrimaryButton } from '../landing-ui';
import { Reveal } from '../reveal';

export function ClosingCtaSection() {
  return (
    <LandingSection className="py-16 md:py-24">
      <Reveal>
        <div className="bg-primary text-on-primary rounded-2xl p-10 md:p-16 text-center max-w-5xl mx-auto shadow-2xl">
          <h2 className="text-3xl md:text-5xl font-semibold mb-4 tracking-tight">
            Modernize your restaurant operations today.
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
            Join high-performing restaurants running seamless dining rooms, faster kitchens, and
            real-time reports with {APP_NAME}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <MarketingPrimaryButton href="#pricing" className="!bg-white !text-[var(--landing-text)] hover:!bg-[var(--landing-surface-subtle)]">
              Start 14-day free trial
              <Icon name="arrow_forward" className="text-lg" />
            </MarketingPrimaryButton>
            <LandingNavLink
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border-2 border-white text-white text-sm font-semibold bg-transparent hover:bg-white/15 transition-colors shadow-sm"
            >
              Schedule demo
            </LandingNavLink>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm lm-font-mono text-white/70">
            <span>✓ Instant self-onboarding</span>
            <span>✓ No credit card required</span>
            <span>✓ Free menu migration support</span>
          </div>
        </div>
      </Reveal>
    </LandingSection>
  );
}
