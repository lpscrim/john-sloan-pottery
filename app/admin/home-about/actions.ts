'use server';

import { createServerSupabase } from '@/app/_lib/supabase';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { HOME_ABOUT_DEFAULTS } from '@/app/_lib/homeAboutContent';
import { revalidatePath } from 'next/cache';

const BUCKET = 'about-images';
const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

function isAllowed(file: File) {
  return ALLOWED.includes(file.name.split('.').pop()?.toLowerCase() ?? '');
}

async function getImages(): Promise<string[]> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'home_about_images')
    .single();
  if (!data) return HOME_ABOUT_DEFAULTS.images;
  try { return JSON.parse(data.value); } catch { return HOME_ABOUT_DEFAULTS.images; }
}

function revalidate() {
  revalidatePath('/');
  revalidatePath('/admin/home-about');
}

export async function saveHomeAboutText(
  text: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'home_about_text', value: text }, { onConflict: 'key' });
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function uploadHomeAboutImage(
  formData: FormData,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireAdminUser();
    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) return { success: false, error: 'No file provided.' };
    if (!isAllowed(file)) return { success: false, error: 'File type not allowed.' };
    if (file.size > 4 * 1024 * 1024) return { success: false, error: 'File exceeds 4 MB.' };

    const supabase = createServerSupabase();
    const ext = file.name.split('.').pop() ?? 'webp';
    const path = `home/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return { success: false, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const existing = await getImages();

    const { error: dbError } = await supabase
      .from('settings')
      .upsert(
        { key: 'home_about_images', value: JSON.stringify([...existing, data.publicUrl]) },
        { onConflict: 'key' },
      );
    if (dbError) return { success: false, error: dbError.message };

    revalidate();
    return { success: true, url: data.publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function removeHomeAboutImage(
  url: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const existing = await getImages();
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('settings')
      .upsert(
        { key: 'home_about_images', value: JSON.stringify(existing.filter((u) => u !== url)) },
        { onConflict: 'key' },
      );
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function resetHomeAboutToDefault(): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const supabase = createServerSupabase();
    const { error } = await supabase.from('settings').upsert(
      [
        { key: 'home_about_text', value: HOME_ABOUT_DEFAULTS.text },
        { key: 'home_about_images', value: JSON.stringify(HOME_ABOUT_DEFAULTS.images) },
      ],
      { onConflict: 'key' },
    );
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
