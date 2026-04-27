'use server';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/app/_lib/supabase';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import type { ShippingRegion } from '@/app/_lib/shippingSettings';

async function upsertSetting(key: string, pence: number) {
  await requireAdminUser();
  if (!Number.isInteger(pence) || pence < 0) throw new Error('Invalid shipping rate');
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(pence) }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/settings');
}

export async function updatePrintShippingRate(pence: number) {
  await upsertSetting('print_shipping_rate_pence', pence);
}

export async function updateArtworkShippingRate(pence: number) {
  await upsertSetting('artwork_shipping_rate_pence', pence);
}

export async function updateEuPrintShippingRate(pence: number) {
  await upsertSetting('eu_print_shipping_rate_pence', pence);
}

export async function updateEuArtworkShippingRate(pence: number) {
  await upsertSetting('eu_artwork_shipping_rate_pence', pence);
}

export async function updateIntPrintShippingRate(pence: number) {
  await upsertSetting('int_print_shipping_rate_pence', pence);
}

export async function updateIntArtworkShippingRate(pence: number) {
  await upsertSetting('int_artwork_shipping_rate_pence', pence);
}

/** @deprecated kept for compatibility */
export async function updateShippingRate(pence: number) {
  await updateArtworkShippingRate(pence);
}

export async function updateShippingRegion(region: ShippingRegion) {
  await requireAdminUser();
  if (!['gb', 'eu', 'international'].includes(region)) throw new Error('Invalid region');
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'shipping_region', value: region }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/settings');
  revalidatePath('/checkout');
}

export async function updateCategoriesVisible(visible: boolean) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'categories_visible', value: String(visible) }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/settings');
  revalidatePath('/work');
}
