'use client';

import { useMemo, useState } from 'react';
import { FLOOR_FILTERS, FLOOR_TABLES, type FloorTableStatus } from '../landing-marketing-data';
import { Eyebrow, LandingSection } from '../landing-ui';
import { Reveal } from '../reveal';

type FilterId = 'all' | FloorTableStatus | 'reserved';

export function FloorPlanShowcaseSection() {
  const [filter, setFilter] = useState<FilterId>('all');

  const visible = useMemo(() => {
    if (filter === 'all') return FLOOR_TABLES;
    return FLOOR_TABLES.filter((t) => t.status === filter);
  }, [filter]);

  return (
    <LandingSection id="floor-plan" className="py-16 md:py-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <Reveal>
          <Eyebrow>Visual Layouts</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--landing-text)] mt-1 tracking-tight">
            Manage every table visually.
          </h2>
        </Reveal>
        <div className="flex flex-wrap gap-2 p-1 bg-[var(--landing-surface-subtle)] rounded-lg text-xs">
          {FLOOR_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === f.id
                  ? 'bg-[var(--landing-surface-raised)] font-semibold text-[var(--landing-text)] shadow-sm'
                  : 'text-[var(--landing-text-dim)] hover:text-[var(--landing-text)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 p-4 md:p-6 bg-[var(--landing-surface-subtle)] rounded-xl">
          {visible.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      </Reveal>
    </LandingSection>
  );
}

function TableCard({ table }: { table: (typeof FLOOR_TABLES)[number] }) {
  const occupied = table.status === 'occupied';
  const bill = table.status === 'bill';
  const available = table.status === 'available';
  const reserved = table.status === 'reserved';

  const border =
    occupied || bill
      ? bill
        ? 'border-secondary-container/60'
        : 'border-[var(--landing-emerald-border)]/70'
      : 'border-[var(--landing-border-subtle)]';

  return (
    <div className={`bg-[var(--landing-surface-raised)] p-4 md:p-5 rounded-xl border shadow-sm ${border}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-[var(--landing-text)]">{table.label}</span>
          {occupied && (
            <span className="text-[10px] lm-font-mono bg-[var(--landing-emerald-surface)] text-[var(--landing-emerald-text)] px-1.5 py-0.5 rounded font-semibold">
              Dining
            </span>
          )}
          {bill && table.statusLabel && (
            <span className="text-[10px] lm-font-mono bg-secondary-fixed text-on-secondary-container px-1.5 py-0.5 rounded font-semibold">
              {table.statusLabel}
            </span>
          )}
        </div>
        {occupied && <span className="w-2.5 h-2.5 rounded-full bg-[var(--landing-emerald-border)] animate-pulse" />}
        {available && <span className="w-2.5 h-2.5 rounded-full bg-[var(--landing-border-strong)]" />}
        {reserved && <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />}
        {bill && <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-pulse" />}
      </div>
      <p className="text-xs lm-font-mono text-[var(--landing-text-dim)] mb-1">Seats: {table.seats}</p>
      {table.server && <p className="text-xs font-medium text-[var(--landing-text)]">Server: {table.server}</p>}
      {available && <p className="text-xs text-[var(--landing-text-dim)]">Available</p>}
      {reserved && <p className="text-xs text-[var(--landing-text-dim)]">Reserved</p>}
      {table.ticket && table.amount && (
        <div className="mt-3 pt-2 bg-surface-container-high px-2.5 py-1.5 rounded-lg flex justify-between text-xs lm-font-mono">
          <span>{table.ticket}</span>
          <span className="font-bold">{table.amount}</span>
        </div>
      )}
      {bill && table.amount && (
        <div className="mt-3 pt-2 bg-secondary-fixed px-2.5 py-1.5 rounded-lg flex justify-between text-xs lm-font-mono text-on-secondary-container">
          <span className="font-medium">Bill Printed</span>
          <span className="font-bold">{table.amount}</span>
        </div>
      )}
      {table.footer && (
        <div
          className={`mt-3 pt-2 px-2 py-1.5 rounded-lg text-center text-xs lm-font-mono ${
            available
              ? 'bg-[var(--landing-emerald-surface)]/50 border border-[var(--landing-emerald-border)]/40 text-[var(--landing-emerald-text)] font-medium'
              : 'bg-[var(--landing-surface-subtle)] text-[var(--landing-text-muted)]'
          }`}
        >
          {table.footer}
        </div>
      )}
    </div>
  );
}
