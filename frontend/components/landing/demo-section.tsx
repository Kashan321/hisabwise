'use client';

import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { submitDemoRequest } from '@/lib/api/public-marketing';
import type { PublicDemoConfig } from '@/lib/api/types';
import { Icon } from '@/components/ui';
import { Eyebrow } from './landing-ui';
import { Reveal } from './reveal';

const DEMO_HIGHLIGHTS = [
  'POS, KDS, and floor plan walkthrough',
  'QR ordering and delivery workflows',
  'Reports, roles, and onboarding Q&A',
] as const;

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void;
    };
  }
}

function loadCalendlyScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Calendly) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-calendly]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.dataset.calendly = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Calendly'));
    document.body.appendChild(script);
  });
}

function ManualDemoForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const ok = await submitDemoRequest({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      source: 'MANUAL',
    });
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
    } else {
      setError('Could not submit your request. Please try again.');
    }
  }

  if (submitted) {
    return (
      <p className="text-center text-[var(--landing-text-muted)] py-12">
        Thanks! We&apos;ll reach out shortly to schedule your demo.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <input
        required
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl border border-[var(--landing-border-subtle)] bg-[var(--landing-surface-raised)] text-sm"
      />
      <input
        required
        type="email"
        placeholder="Work email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl border border-[var(--landing-border-subtle)] bg-[var(--landing-surface-raised)] text-sm"
      />
      <input
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl border border-[var(--landing-border-subtle)] bg-[var(--landing-surface-raised)] text-sm"
      />
      <input
        placeholder="Restaurant name (optional)"
        value={form.company}
        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl border border-[var(--landing-border-subtle)] bg-[var(--landing-surface-raised)] text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-xl bg-[var(--landing-cta)] text-white font-semibold text-sm disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Request a demo'}
      </button>
    </form>
  );
}

export function DemoSection() {
  const [config, setConfig] = useState<PublicDemoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/public/demo`);
        if (!res.ok) return;
        const json = (await res.json()) as {
          success: boolean;
          data?: { demo: PublicDemoConfig };
        };
        if (!cancelled && json.success && json.data?.demo) {
          setConfig(json.data.demo);
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

  useEffect(() => {
    const calendlyUrl = config?.calendlyUrl;
    if (!calendlyUrl || !widgetRef.current) return;

    let mounted = true;
    loadCalendlyScript()
      .then(() => {
        if (!mounted || !widgetRef.current || !window.Calendly) return;
        widgetRef.current.innerHTML = '';
        window.Calendly.initInlineWidget({
          url: calendlyUrl,
          parentElement: widgetRef.current,
        });
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [config?.calendlyUrl]);

  useEffect(() => {
    function onCalendlyMessage(event: MessageEvent) {
      if (event.origin !== 'https://calendly.com') return;
      const data = event.data as {
        event?: string;
        payload?: {
          invitee?: { uri?: string; email?: string; name?: string };
          event?: { start_time?: string; name?: string };
        };
      };
      if (data.event !== 'calendly.event_scheduled' || !data.payload?.invitee) return;

      const invitee = data.payload.invitee;
      const scheduled = data.payload.event;
      void submitDemoRequest({
        name: invitee.name ?? 'Unknown',
        email: invitee.email ?? '',
        scheduledAt: scheduled?.start_time ?? null,
        eventName: scheduled?.name ?? null,
        calendlyInviteeUri: invitee.uri ?? null,
        source: 'CALENDLY',
      });
    }

    window.addEventListener('message', onCalendlyMessage);
    return () => window.removeEventListener('message', onCalendlyMessage);
  }, []);

  return (
    <section id="demo" className="py-16 md:py-24 px-5 lg:px-12 bg-[var(--landing-canvas)]">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="bg-[var(--landing-surface-raised)] rounded-2xl shadow-xl border border-[var(--landing-border-subtle)] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-4 flex flex-col justify-center gap-6 p-8 md:p-10 lg:border-r border-[var(--landing-border-subtle)] bg-[var(--landing-surface-subtle)]/40">
                <div>
                  <Eyebrow>Resources</Eyebrow>
                  <h2 className="mt-2 text-2xl md:text-3xl font-bold text-[var(--landing-text)] tracking-tight">
                    See Hisab Wise in action
                  </h2>
                  <p className="text-sm text-[var(--landing-text-muted)] mt-3 leading-relaxed">
                    Walk through POS, kitchen display, delivery, and reporting with our team — pick
                    a time that works for you.
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-[var(--landing-text-muted)]">
                  {DEMO_HIGHLIGHTS.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Icon name="check_circle" className="text-lg text-[var(--landing-text)] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs lm-font-mono text-[var(--landing-text-dim)]">
                  Typical session · 30 minutes · No commitment
                </p>
              </div>

              <div className="lg:col-span-8 p-6 md:p-8 min-h-[480px] lg:min-h-[560px] flex flex-col">
                {loading ? (
                  <div className="flex-1 rounded-xl bg-[var(--landing-surface-subtle)] animate-pulse min-h-[420px]" />
                ) : config?.calendlyUrl ? (
                  <div
                    ref={widgetRef}
                    className="calendly-inline-widget flex-1 w-full rounded-xl overflow-hidden border border-[var(--landing-border-subtle)] min-h-[480px] lg:min-h-[520px]"
                    data-url={config.calendlyUrl}
                  />
                ) : (
                  <div className="flex-1 flex flex-col justify-center rounded-xl border border-[var(--landing-border-subtle)] bg-[var(--landing-surface-subtle)]/50 p-6 md:p-8">
                    <p className="text-sm text-[var(--landing-text-muted)] mb-6">
                      Calendly isn&apos;t configured yet. Leave your details and we&apos;ll contact
                      you to schedule a walkthrough.
                    </p>
                    <ManualDemoForm />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
