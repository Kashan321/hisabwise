/** ISO 3166-1 alpha-2 country code → ISO 4217 currency code */
const COUNTRY_CURRENCY: Record<string, string> = {
  PK: 'PKR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  SA: 'SAR',
  IN: 'INR',
  CA: 'CAD',
  AU: 'AUD',
  EU: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  TR: 'TRY',
  MY: 'MYR',
  SG: 'SGD',
  BD: 'BDT',
  QA: 'QAR',
  KW: 'KWD',
  OM: 'OMR',
  BH: 'BHD',
  CN: 'CNY',
  JP: 'JPY',
  KR: 'KRW',
  ZA: 'ZAR',
  NG: 'NGN',
  EG: 'EGP',
};

export const SUPPORTED_CURRENCIES = [
  'PKR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
  'INR',
  'CAD',
  'AUD',
  'TRY',
  'MYR',
  'SGD',
  'BDT',
  'QAR',
  'CNY',
  'JPY',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function currencyFromCountry(countryCode: string | null | undefined): SupportedCurrency {
  if (!countryCode) return 'USD';
  const code = countryCode.trim().toUpperCase();
  const mapped = COUNTRY_CURRENCY[code];
  if (mapped && SUPPORTED_CURRENCIES.includes(mapped as SupportedCurrency)) {
    return mapped as SupportedCurrency;
  }
  return 'USD';
}

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
