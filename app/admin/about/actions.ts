'use server';

import { createServerSupabase } from '@/app/_lib/supabase';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { revalidatePath } from 'next/cache';

const BUCKET = 'about-images';
const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

function isAllowed(file: File) {
  return ALLOWED.includes(file.name.split('.').pop()?.toLowerCase() ?? '');
}

export async function saveAboutText(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const statement = (formData.get('statement') as string | null) ?? '';
    const bio = (formData.get('bio') as string | null) ?? '';
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('about_content')
      .upsert({ id: 1, statement, bio, updated_at: new Date().toISOString() });
    if (error) return { success: false, error: error.message };
    revalidatePath('/about');
    revalidatePath('/admin/about');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function saveSecondaryText(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const secondary_text = (formData.get('secondary_text') as string | null) ?? '';
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('about_content')
      .upsert({ id: 1, secondary_text, updated_at: new Date().toISOString() });
    if (error) return { success: false, error: error.message };
    revalidatePath('/about');
    revalidatePath('/admin/about');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function uploadAboutPortrait(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireAdminUser();

    const file = formData.get('portrait') as File | null;
    if (!file || file.size === 0) return { success: false, error: 'No file provided.' };
    if (!isAllowed(file)) return { success: false, error: 'File type not allowed.' };
    if (file.size > 4 * 1024 * 1024) return { success: false, error: 'File exceeds 4 MB.' };

    const supabase = createServerSupabase();
    const ext = file.name.split('.').pop() ?? 'webp';
    const path = `portrait/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) return { success: false, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: dbError } = await supabase.from('about_content').upsert({
      id: 1,
      portrait_url: data.publicUrl,
      updated_at: new Date().toISOString(),
    });

    if (dbError) return { success: false, error: dbError.message };

    revalidatePath('/about');
    revalidatePath('/admin/about');
    return { success: true, url: data.publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function uploadAboutSecondaryImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireAdminUser();

    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) return { success: false, error: 'No file provided.' };
    if (!isAllowed(file)) return { success: false, error: 'File type not allowed.' };
    if (file.size > 4 * 1024 * 1024) return { success: false, error: 'File exceeds 4 MB.' };

    const supabase = createServerSupabase();
    const ext = file.name.split('.').pop() ?? 'webp';
    const path = `secondary/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) return { success: false, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: dbError } = await supabase.from('about_content').upsert({
      id: 1,
      secondary_image_url: data.publicUrl,
      updated_at: new Date().toISOString(),
    });

    if (dbError) return { success: false, error: dbError.message };

    revalidatePath('/about');
    revalidatePath('/admin/about');
    return { success: true, url: data.publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function uploadGalleryImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireAdminUser();

    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) return { success: false, error: 'No file provided.' };
    if (!isAllowed(file)) return { success: false, error: 'File type not allowed.' };
    if (file.size > 4 * 1024 * 1024) return { success: false, error: 'File exceeds 4 MB.' };

    const supabase = createServerSupabase();
    const ext = file.name.split('.').pop() ?? 'webp';
    const path = `gallery/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) return { success: false, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: current } = await supabase
      .from('about_content')
      .select('gallery_images')
      .eq('id', 1)
      .single();

    const existing = (current?.gallery_images as string[]) ?? [];

    const { error: dbError } = await supabase.from('about_content').upsert({
      id: 1,
      gallery_images: [...existing, data.publicUrl],
      updated_at: new Date().toISOString(),
    });

    if (dbError) return { success: false, error: dbError.message };

    revalidatePath('/about');
    revalidatePath('/admin/about');
    return { success: true, url: data.publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function removeGalleryImage(
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();

    const supabase = createServerSupabase();
    const { data: current } = await supabase
      .from('about_content')
      .select('gallery_images')
      .eq('id', 1)
      .single();

    const existing = (current?.gallery_images as string[]) ?? [];

    const { error } = await supabase
      .from('about_content')
      .update({
        gallery_images: existing.filter((u) => u !== url),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) return { success: false, error: error.message };

    revalidatePath('/about');
    revalidatePath('/admin/about');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
