const DEFAULT_TICKET_PREFIX = 'TKT';

export function ticketPrefixFromSlug(slug: string): string {
  const normalized = slug.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (normalized || DEFAULT_TICKET_PREFIX).slice(0, 8);
}

/** Use configured prefix, or derive from slug when unset / default. */
export function resolveTicketPrefix(slug: string, configuredPrefix?: string | null): string {
  const configured = configuredPrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
  if (configured && configured !== DEFAULT_TICKET_PREFIX) {
    return configured.slice(0, 8);
  }
  return ticketPrefixFromSlug(slug);
}

export function sanitizeTicketPrefixInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}
