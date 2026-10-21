export const SUPPORTED_CURRENCIES = [
  { code: 'PKR', label: 'Pakistani Rupee (PKR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'TRY', label: 'Turkish Lira (TRY)' },
  { code: 'MYR', label: 'Malaysian Ringgit (MYR)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'BDT', label: 'Bangladeshi Taka (BDT)' },
  { code: 'QAR', label: 'Qatari Riyal (QAR)' },
  { code: 'CNY', label: 'Chinese Yuan (CNY)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
] as const;

export const DEFAULT_CURRENCY = 'USD';

export function currencyFromCountry(countryCode: string | null | undefined): string {
  const map: Record<string, string> = {
    PK: 'PKR',
    US: 'USD',
    GB: 'GBP',
    AE: 'AED',
    SA: 'SAR',
    IN: 'INR',
    CA: 'CAD',
    AU: 'AUD',
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
    CN: 'CNY',
    JP: 'JPY',
  };
  if (!countryCode) return DEFAULT_CURRENCY;
  return map[countryCode.trim().toUpperCase()] ?? DEFAULT_CURRENCY;
}
