import { createServerSupabase } from './supabase';
import {
  ALLOWED_COUNTRIES,
  resolveRateForCountry,
  resolveShippingRate,
  type ShippingRates,
  type ShippingRegion,
} from './shippingRules';

export { ALLOWED_COUNTRIES, resolveRateForCountry, resolveShippingRate };
export type { ShippingRates, ShippingRegion };

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
