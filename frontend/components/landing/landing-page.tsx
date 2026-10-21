'use client';

import { Inter, Space_Mono } from 'next/font/google';
import { useState } from 'react';
import type { ThemeColors } from '@/lib/theme/theme-css';
import { themeToStyle } from '@/lib/theme/theme-css';
import './landing-marketing.css';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { DemoSection } from './demo-section';
import { PricingTable } from './pricing-table';
import { AnalyticsSection } from './sections/analytics-section';
import { ArchitectureComparisonSection } from './sections/architecture-comparison-section';
import { ArchetypesSection } from './sections/archetypes-section';
import { ClosingCtaSection } from './sections/closing-cta-section';
import { FaqSection } from './sections/faq-section';
import { FloorPlanShowcaseSection } from './sections/floor-plan-showcase-section';
import { HeroSection } from './sections/hero-section';
import { OnboardingSection } from './sections/onboarding-section';
import { OperationsSection } from './sections/operations-section';
import { QrExperienceSection } from './sections/qr-experience-section';
import { RoleMatrixSection } from './sections/role-matrix-section';
import { ServiceWalkthroughSection } from './sections/service-walkthrough-section';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-landing',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-landing-mono',
});

export function LandingPage({ branding }: { branding: ThemeColors }) {
  const [billingAnnual, setBillingAnnual] = useState(false);

  return (
    <div
      className={`landing-marketing ${inter.variable} ${spaceMono.variable} min-h-screen antialiased`}
      style={{
        ...themeToStyle(branding),
        fontFamily: 'var(--font-landing), system-ui, sans-serif',
      }}
    >
      <LandingHeader />
      <main className="w-full pt-0">
        <HeroSection />
        <ArchitectureComparisonSection />
        <ServiceWalkthroughSection />
        <OperationsSection />
        <FloorPlanShowcaseSection />
        <QrExperienceSection />
        <RoleMatrixSection />
        <AnalyticsSection />
        <ArchetypesSection />
        <OnboardingSection />
        <PricingTable billingAnnual={billingAnnual} onBillingChange={setBillingAnnual} />
        <DemoSection />
        <FaqSection />
        <ClosingCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
