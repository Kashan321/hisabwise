/** Infrequently changing tenant reference data (menu, tables, customers). */
export const REFERENCE_STALE_MS = 5 * 60_000;
export const REFERENCE_GC_MS = 30 * 60_000;

/** Promotions can change more often but rarely mid-POS session. */
export const PROMOTIONS_STALE_MS = 2 * 60_000;

/** Order lists & kitchen — cached briefly; optimistic updates keep UI instant. */
export const ORDER_LIST_STALE_MS = 20_000;
export const KITCHEN_QUEUE_STALE_MS = 15_000;

/** Dashboard / reports aggregates. */
export const REPORT_STALE_MS = 60_000;
