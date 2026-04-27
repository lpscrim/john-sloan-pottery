import { createServerSupabase } from './supabase';

export interface ShippingRates {
  // GB rates
  printRate: number;
  artworkRate: number;
  // EU / EEA rates
  euPrintRate: number;
  euArtworkRate: number;
  // International rates
  intPrintRate: number;
  intArtworkRate: number;
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

export async function getShippingRates(): Promise<ShippingRates> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'print_shipping_rate_pence',
      'artwork_shipping_rate_pence',
      'eu_print_shipping_rate_pence',
      'eu_artwork_shipping_rate_pence',
      'int_print_shipping_rate_pence',
      'int_artwork_shipping_rate_pence',
    ]);

  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const parse = (key: string) => map.has(key) ? parseInt(map.get(key)!, 10) : 0;
  return {
    printRate:      parse('print_shipping_rate_pence'),
    artworkRate:    parse('artwork_shipping_rate_pence'),
    euPrintRate:    parse('eu_print_shipping_rate_pence'),
    euArtworkRate:  parse('eu_artwork_shipping_rate_pence'),
    intPrintRate:   parse('int_print_shipping_rate_pence'),
    intArtworkRate: parse('int_artwork_shipping_rate_pence'),
  };
}

/** Returns the GB shipping rate (used at PI creation time before country is known). */
export function resolveShippingRate(rates: ShippingRates, itemTypes: string[]): number {
  return resolveRateForCountry(rates, itemTypes, 'GB');
}

/** Returns the shipping rate for a specific destination country. */
export function resolveRateForCountry(
  rates: ShippingRates,
  itemTypes: string[],
  country: string,
): number {
  const hasArtwork = itemTypes.some((t) => t !== 'print');
  if (country === 'GB') return hasArtwork ? rates.artworkRate    : rates.printRate;
  if (EU_COUNTRY_SET.has(country)) return hasArtwork ? rates.euArtworkRate  : rates.euPrintRate;
  return hasArtwork ? rates.intArtworkRate : rates.intPrintRate;
}

/** @deprecated Use getShippingRates + resolveShippingRate instead */
export async function getShippingRatePence(): Promise<number> {
  const rates = await getShippingRates();
  return rates.artworkRate;
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
