import { Icon } from '@/components/ui';
import { LANDING_IMAGES } from '../landing-data';
import { Eyebrow, LandingSection, PhoneFrame } from '../landing-ui';
import { Reveal } from '../reveal';

export function QrExperienceSection() {
  return (
    <LandingSection id="qr" className="py-16 md:py-24 bg-[var(--landing-surface-subtle)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <Reveal className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 bg-[var(--landing-surface-raised)] px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
            <Icon name="qr_code_2" className="text-base" />
            Zero App Download
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] leading-tight tracking-tight">
            Let customers order and pay from their phone.
          </h2>
          <p className="text-lg text-[var(--landing-text-muted)]">
            Generate unique table-bound QR codes. Guests browse live items, customize modifiers, and
            send tickets directly into the kitchen queue.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: 'touch_app',
                title: 'Real-time Catalog Synchronization',
                text: 'If an item is 86’d at the counter, it grays out on guest phones instantly.',
              },
              {
                icon: 'credit_card',
                title: 'Split Bills on the Spot',
                text: 'Guests can settle individual shares without flagging staff.',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <Icon name={item.icon} className="text-[var(--landing-text)] mt-1" />
                <div>
                  <p className="font-semibold text-[var(--landing-text)]">{item.title}</p>
                  <p className="text-sm text-[var(--landing-text-muted)]">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={80} className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-sm">
            <PhoneFrame src={LANDING_IMAGES.qrMenu} alt="QR guest menu" />
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}
