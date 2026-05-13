'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { createServerSupabase } from '@/app/_lib/supabase';
import {
  HOME_FEATURED_COLLECTIONS_DEFAULTS,
  type HomeFeaturedCollectionSlide,
} from '@/app/_lib/homeFeaturedCollections';

const BUCKET = 'about-images';
const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

function isAllowed(file: File) {
  return ALLOWED.includes(file.name.split('.').pop()?.toLowerCase() ?? '');
}

function revalidate() {
  revalidatePath('/');
  revalidatePath('/admin/home-featured');
}

function sanitizeSlides(slides: HomeFeaturedCollectionSlide[]): HomeFeaturedCollectionSlide[] {
  return slides.slice(0, 3).map((slide, index) => ({
    title: slide.title?.trim() || HOME_FEATURED_COLLECTIONS_DEFAULTS.slides[index].title,
    text: slide.text?.trim() || HOME_FEATURED_COLLECTIONS_DEFAULTS.slides[index].text,
    category: slide.category?.trim() || HOME_FEATURED_COLLECTIONS_DEFAULTS.slides[index].category,
    buttonLabel: slide.buttonLabel?.trim() || HOME_FEATURED_COLLECTIONS_DEFAULTS.slides[index].buttonLabel,
    imageUrl: slide.imageUrl?.trim() || '',
  }));
}

export async function saveHomeFeaturedCollections(
  slides: HomeFeaturedCollectionSlide[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('settings')
      .upsert(
        { key: 'home_featured_collections', value: JSON.stringify(sanitizeSlides(slides)) },
        { onConflict: 'key' },
      );
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function uploadHomeFeaturedCollectionImage(
  formData: FormData,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireAdminUser();
    const file = formData.get('image') as File | null;
    const index = Number(formData.get('index'));
    if (!file || file.size === 0) return { success: false, error: 'No file provided.' };
    if (!Number.isInteger(index) || index < 0 || index > 2) return { success: false, error: 'Invalid slide index.' };
    if (!isAllowed(file)) return { success: false, error: 'File type not allowed.' };
    if (file.size > 4 * 1024 * 1024) return { success: false, error: 'File exceeds 4 MB.' };

    const supabase = createServerSupabase();
    const ext = file.name.split('.').pop() ?? 'webp';
    const path = `home-featured/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return { success: false, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function resetHomeFeaturedCollections(): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('settings')
      .upsert(
        { key: 'home_featured_collections', value: JSON.stringify(HOME_FEATURED_COLLECTIONS_DEFAULTS.slides) },
        { onConflict: 'key' },
      );
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}