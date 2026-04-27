'use server';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/app/_lib/supabase';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { SHIPPING_RATE_KEYS, type ShippingRegion } from '@/app/_lib/shippingSettings';

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

export async function updateGbShippingRate(pence: number) {
  await upsertSetting(SHIPPING_RATE_KEYS.gb, pence);
}

export async function updateEuShippingRate(pence: number) {
  await upsertSetting(SHIPPING_RATE_KEYS.eu, pence);
}

export async function updateIntShippingRate(pence: number) {
  await upsertSetting(SHIPPING_RATE_KEYS.int, pence);
}

/** @deprecated kept for compatibility */
export async function updateShippingRate(pence: number) {
  await updateGbShippingRate(pence);
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
