import { env } from '../../../config/env';

export function buildCounterOrderUrl(businessSlug: string): string {
  return `${env.APP_URL}/${businessSlug}/order`;
}

export function buildTableOrderUrl(businessSlug: string, tableIdentifier: string): string {
  return `${env.APP_URL}/${businessSlug}/tables/${tableIdentifier}`;
}

export interface QrPayload {
  type: 'counter' | 'table';
  url: string;
  businessSlug: string;
  tableIdentifier?: string;
}
