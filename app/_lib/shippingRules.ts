export interface ShippingRates {
  gbRate: number;
  euRate: number;
  intRate: number;
}

export type ShippingRegion = 'gb' | 'eu' | 'international';

// EU/EEA countries (excluding GB) plus supported nearby destinations.
const EU_COUNTRY_SET = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
  'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO', 'IS',
]);

export const ALLOWED_COUNTRIES: Record<ShippingRegion, string[]> = {
  gb: ['GB'],
  eu: [
    'GB', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
    'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
    'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO', 'IS',
  ],
  international: [
    'GB', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
    'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
    'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO', 'IS',
    'US', 'CA', 'AU', 'NZ', 'JP', 'SG', 'HK', 'AE', 'SA',
  ],
};

export function resolveShippingRate(rates: ShippingRates): number {
  return resolveRateForCountry(rates, 'GB');
}

export function resolveRateForCountry(rates: ShippingRates, country: string): number {
  if (country === 'GB') return rates.gbRate;
  if (EU_COUNTRY_SET.has(country)) return rates.euRate;
  return rates.intRate;
}