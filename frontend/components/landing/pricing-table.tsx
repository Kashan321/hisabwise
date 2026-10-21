'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { API_BASE_URL } from '@/lib/config';
import { formatCurrency } from '@/lib/format-currency';
import type { PublicPricing } from '@/lib/api/types';
import { PRICING_FEATURES } from './landing-data';
import { Eyebrow } from './landing-ui';
import { Reveal } from './reveal';

function PricingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto rounded-2xl bg-[var(--landing-surface-raised)] border border-[var(--landing-border-subtle)] p-8 animate-pulse grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-4">
        <div className="h-4 w-32 bg-[var(--landing-surface-subtle)] rounded" />
        <div className="h-8 w-48 bg-[var(--landing-surface-subtle)] rounded" />
        <div className="h-12 w-40 bg-[var(--landing-surface-subtle)] rounded" />
      </div>
      <div className="lg:col-span-8 grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-[var(--landing-surface-subtle)] rounded" />
        ))}
      </div>
    </div>
  );
}

export function PricingTable({
  billingAnnual,
  onBillingChange,
}: {
  billingAnnual: boolean;
  onBillingChange: (annual: boolean) => void;
}) {
  const [pricing, setPricing] = useState<PublicPricing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/public/pricing`);
        if (!res.ok) return;
        const json = (await res.json()) as {
          success: boolean;
          data?: { pricing: PublicPricing };
        };
        if (!cancelled && json.success && json.data?.pricing) {
          setPricing(json.data.pricing);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthly = pricing?.plans.monthly;
  const yearly = pricing?.plans.yearly;
  const savingsPercent = yearly?.savingsPercent ?? 0;
  const displayPrice = billingAnnual ? yearly?.price ?? 0 : monthly?.price ?? 0;
  const currency = pricing?.currency ?? monthly?.currency ?? 'PKR';
  const trialDays = pricing?.defaultTrialDays ?? 14;

  return (
    <section id="pricing" className="py-16 md:py-24 px-5 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center max-w-2xl mx-auto mb-10">
          <Eyebrow>Simple, Honest Pricing</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-2 tracking-tight">
            One plan. Everything included.
          </h2>
          <p className="text-lg text-[var(--landing-text-muted)] mt-2">
            No hidden module fees, no per-terminal surcharge, and no credit card required to start.
          </p>
        </Reveal>

        <Reveal className="flex justify-center mb-8">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--landing-surface-subtle)] border border-[var(--landing-border-subtle)]">
            <button
              type="button"
              onClick={() => onBillingChange(false)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !billingAnnual
                  ? 'bg-[var(--landing-surface-raised)] text-[var(--landing-text)] shadow-sm'
                  : 'text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onBillingChange(true)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billingAnnual
                  ? 'bg-[var(--landing-surface-raised)] text-[var(--landing-text)] shadow-sm'
                  : 'text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]'
              }`}
            >
              Yearly
              {savingsPercent > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">
                  -{savingsPercent}%
                </span>
              )}
            </button>
          </div>
        </Reveal>

        {loading ? (
          <PricingSkeleton />
        ) : (
          <Reveal>
            <div className="max-w-6xl mx-auto bg-[var(--landing-surface-raised)] rounded-2xl shadow-xl border border-[var(--landing-border-subtle)] overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[320px]">
                <div className="lg:col-span-4 flex flex-col justify-between gap-6 p-8 md:p-10 lg:border-r border-[var(--landing-border-subtle)] bg-[var(--landing-surface-subtle)]/40">
                  <div>
                    <span className="text-[11px] font-semibold uppercase bg-[var(--landing-surface-raised)] px-3 py-1 rounded text-[var(--landing-text-muted)] border border-[var(--landing-border-subtle)]">
                      Complete Operating Suite
                    </span>
                    <h3 className="text-2xl md:text-3xl font-bold text-[var(--landing-text)] mt-4 tracking-tight">
                      Full Restaurant License
                    </h3>
                    <p className="text-sm text-[var(--landing-text-muted)] mt-3 leading-relaxed">
                      Deploy across staff phones, kitchen displays, and tablets without artificial
                      caps. {trialDays}-day free trial included.
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-3xl sm:text-4xl font-bold text-[var(--landing-text)] tabular-nums whitespace-nowrap">
                        {formatCurrency(displayPrice, currency)}
                      </span>
                      <span className="text-sm text-[var(--landing-text-dim)]">
                        / restaurant / {billingAnnual ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingAnnual && yearly?.monthlyEquivalent ? (
                      <p className="text-sm text-[var(--landing-text-dim)] mt-2">
                        {formatCurrency(yearly.monthlyEquivalent, currency)}/mo when billed yearly
                      </p>
                    ) : null}
                    <Link
                      href="/register"
                      className="mt-6 block w-full text-center py-3.5 rounded-xl font-medium text-sm bg-[var(--landing-cta)] text-white hover:bg-[var(--landing-cta-hover)] transition-colors shadow-sm"
                    >
                      Start {trialDays}-day free trial
                    </Link>
                    <p className="text-center lm-font-mono text-[11px] text-[var(--landing-text-dim)] mt-3">
                      {trialDays}-day free trial · Cancel anytime · Instant access
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-8 p-8 md:p-10 flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--landing-text-dim)] mb-4">
                    Everything included
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {PRICING_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 min-w-0">
                        <Icon
                          name="check_circle"
                          className="text-lg text-[var(--landing-text)] shrink-0 mt-0.5"
                        />
                        <span className="text-[var(--landing-text-muted)]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        <p className="text-center text-xs text-[var(--landing-text-dim)] mt-8">
          Prices are managed from platform billing settings and update automatically here.
        </p>
      </div>
    </section>
  );
}
