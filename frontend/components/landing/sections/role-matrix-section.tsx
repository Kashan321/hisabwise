'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui';
import { ROLE_MATRIX, type RoleKey } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

const ROLE_KEYS: RoleKey[] = ['owner', 'manager', 'waiter', 'rider'];

export function RoleMatrixSection() {
  const [role, setRole] = useState<RoleKey>('owner');
  const data = ROLE_MATRIX[role];

  return (
    <LandingSection id="roles" className="py-16 md:py-24">
      <Reveal className="text-center max-w-3xl mx-auto mb-12">
        <Eyebrow>Permissions Architecture</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-2 tracking-tight">
          Every role, the right access.
        </h2>
        <p className="text-lg text-[var(--landing-text-muted)] mt-3">
          Secured from database tables to UI screens. Owners get business intelligence, waiters take
          orders, riders get delivery routes.
        </p>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {ROLE_KEYS.map((key) => {
          const r = ROLE_MATRIX[key];
          const active = role === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`p-4 md:p-5 rounded-xl text-left transition-all border ${
                active
                  ? 'bg-[var(--landing-surface-raised)] shadow-sm ring-2 ring-[var(--landing-cta)] border-transparent'
                  : 'bg-[var(--landing-surface-raised)] shadow-sm border-[var(--landing-border-subtle)] hover:border-[var(--landing-border-strong)]'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--landing-surface-subtle)] flex items-center justify-center mb-3">
                <Icon name={r.icon} className={active ? 'text-[var(--landing-text)]' : 'text-[var(--landing-text-dim)]'} />
              </div>
              <p className="font-semibold text-[var(--landing-text)]">{r.shortTitle}</p>
              <p className="text-xs text-[var(--landing-text-dim)] mt-1">{r.subtitle}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-[var(--landing-surface-raised)] rounded-xl p-6 md:p-8 shadow-sm border border-[var(--landing-border-subtle)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="lm-font-mono text-xs text-[var(--landing-text-dim)] uppercase tracking-wider">
              {data.badge}
            </span>
            <h3 className="text-2xl font-semibold text-[var(--landing-text)] mt-1 mb-4">{data.title}</h3>
            <p className="text-[var(--landing-text-muted)] leading-relaxed mb-6">{data.description}</p>
            <div className="space-y-2 text-sm">
              {data.permissions.map((p) => (
                <div key={p} className="flex items-center gap-2 text-[var(--landing-text)]">
                  <Icon name="verified" className="text-lg" />
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[var(--landing-surface-subtle)] p-4 md:p-6 rounded-lg lm-font-mono text-sm space-y-3">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--landing-border-subtle)]">
              <span>{data.uiHeader}</span>
              <span className="text-[var(--landing-emerald-text)] font-bold">{data.uiStatus}</span>
            </div>
            {data.uiRows.map((row) => (
              <div
                key={row.left}
                className="p-2 bg-[var(--landing-surface-raised)] rounded text-xs flex justify-between gap-2"
              >
                <span>{row.left}</span>
                <span className="font-bold text-right">{row.right}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
