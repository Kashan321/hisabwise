/** Bump when cache key rules or names change (triggers legacy purge on SW activate). */
export const OFFLINE_CACHE_GENERATION = 'v20261117';

export const HTML_PAGES_CACHE = `pages-${OFFLINE_CACHE_GENERATION}`;
export const RSC_PAGES_CACHE = `pages-rsc-${OFFLINE_CACHE_GENERATION}`;

/** @deprecated — do not write new entries; purged on activate */
export const POS_ROUTE_CACHE = 'pos-route-all';

/** Caches deleted on every SW activate (including poisoned generations). */
export const LEGACY_RUNTIME_CACHE_NAMES = [
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
  'pos-route-all',
  'pos-route-explicit',
] as const;