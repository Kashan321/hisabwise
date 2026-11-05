'use client';

import { useMemo } from 'react';
import type { PickupDisplayTicket } from '@/lib/api/types';

function splitTickets(tickets: PickupDisplayTicket[]) {
  const preparing = tickets.filter((t) => t.status === 'PREPARING');
  const ready = tickets.filter((t) => t.status === 'READY');
  return { preparing, ready };
}

function TicketGrid({
  tickets,
  variant,
}: {
  tickets: PickupDisplayTicket[];
  variant: 'preparing' | 'ready';
}) {
  if (!tickets.length) {
    return (
      <div className="hall-display__empty">
        <span>—</span>
      </div>
    );
  }

  return (
    <ul className={`hall-display__grid hall-display__grid--${variant}`}>
      {tickets.map((ticket) => (
        <li key={ticket.id} className="hall-display__ticket">
          {ticket.displayNumber}
        </li>
      ))}
    </ul>
  );
}

export function HallPickupDisplayBoard({
  businessName,
  logoUrl,
  tickets,
  clock,
}: {
  businessName: string;
  logoUrl?: string | null;
  tickets: PickupDisplayTicket[];
  clock: string;
}) {
  const { preparing, ready } = useMemo(() => splitTickets(tickets), [tickets]);

  return (
    <div className="hall-display">
      <header className="hall-display__header">
        <div className="hall-display__header-spacer" aria-hidden />
        <div className="hall-display__brand">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="hall-display__logo" />
          ) : null}
          <h1 className="hall-display__title">{businessName}</h1>
          <p className="hall-display__subtitle">Order status</p>
        </div>
        <div className="hall-display__clock">{clock}</div>
      </header>

      <main className="hall-display__main">
        <section className="hall-display__column hall-display__column--preparing">
          <header className="hall-display__column-head">
            <h2>Now preparing</h2>
            <p>Please wait — we&apos;re making your order</p>
          </header>
          <TicketGrid tickets={preparing} variant="preparing" />
        </section>

        <section className="hall-display__column hall-display__column--ready">
          <header className="hall-display__column-head">
            <h2>Ready for pickup</h2>
            <p>Collect your order when your number appears here</p>
          </header>
          <TicketGrid tickets={ready} variant="ready" />
        </section>
      </main>

      <footer className="hall-display__footer">
        Thank you for your patience
      </footer>
    </div>
  );
}
