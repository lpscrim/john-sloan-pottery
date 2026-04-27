import { createServerSupabase } from './supabase';

export interface ShippingRates {
  gbRate: number;
  euRate: number;
  intRate: number;
}

// EU/EEA countries (excluding GB) — used to bucket a customer's country
const EU_COUNTRY_SET = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
  'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO', 'IS',
]);

export type ShippingRegion = 'gb' | 'eu' | 'international';

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

export async function getShippingRegion(): Promise<ShippingRegion> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'shipping_region')
    .single();
  const val = data?.value;
  if (val === 'eu' || val === 'international') return val;
  return 'gb';
}

// Canonical setting keys. The historic `artwork_*` keys are reused so existing
// DB rows continue to work without a migration.
export const SHIPPING_RATE_KEYS = {
  gb: 'artwork_shipping_rate_pence',
  eu: 'eu_artwork_shipping_rate_pence',
  int: 'int_artwork_shipping_rate_pence',
} as const;

export async function getShippingRates(): Promise<ShippingRates> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [SHIPPING_RATE_KEYS.gb, SHIPPING_RATE_KEYS.eu, SHIPPING_RATE_KEYS.int]);

  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const parse = (key: string) => map.has(key) ? parseInt(map.get(key)!, 10) : 0;
  return {
    gbRate:  parse(SHIPPING_RATE_KEYS.gb),
    euRate:  parse(SHIPPING_RATE_KEYS.eu),
    intRate: parse(SHIPPING_RATE_KEYS.int),
  };
}

/** Returns the GB shipping rate (used at PI creation time before country is known). */
export function resolveShippingRate(rates: ShippingRates): number {
  return resolveRateForCountry(rates, 'GB');
}

/** Returns the shipping rate for a specific destination country. */
export function resolveRateForCountry(rates: ShippingRates, country: string): number {
  if (country === 'GB') return rates.gbRate;
  if (EU_COUNTRY_SET.has(country)) return rates.euRate;
  return rates.intRate;
}

/** @deprecated Use getShippingRates + resolveShippingRate instead */
export async function getShippingRatePence(): Promise<number> {
  const rates = await getShippingRates();
  return rates.gbRate;
}

export async function getCategoriesVisible(): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'categories_visible')
    .single();
  return data ? data.value !== 'false' : true;
}
