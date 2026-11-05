import { buildTenantPath, getPublicAppUrl } from '../../../config/public-app-url';

export function buildCounterOrderUrl(businessSlug: string): string {
  return buildTenantPath(businessSlug, '/order');
}

export function buildTableOrderUrl(businessSlug: string, tableIdentifier: string): string {
  return `${getPublicAppUrl()}/${businessSlug}/tables/${encodeURIComponent(tableIdentifier)}`;
}

export interface QrPayload {
  type: 'counter' | 'table';
  url: string;
  businessSlug: string;
  tableIdentifier?: string;
}
