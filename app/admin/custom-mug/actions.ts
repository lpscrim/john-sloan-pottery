'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/app/_lib/supabase';
import { requireAdminUser } from '@/app/_lib/adminAuth';

function toSlug(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Glazes ──────────────────────────────────────────────────────────────────

export async function addGlaze(_prev: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return { error: 'Name is required.' };
  const slug = toSlug(name);
  const supabase = createServerSupabase();
  const { error } = await supabase.from('glazes').insert({ name, slug });
  if (error) return { error: error.message };
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
  return {};
}

export async function toggleGlazeActive(id: string, active: boolean) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase.from('glazes').update({ active }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}

export async function deleteGlaze(id: string) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase.from('glazes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}

// ─── Mug shapes ──────────────────────────────────────────────────────────────

export async function addShape(_prev: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const name = (formData.get('name') as string | null)?.trim();
  const description = (formData.get('description') as string | null)?.trim() || null;
  if (!name) return { error: 'Name is required.' };
  const slug = toSlug(name);
  const imageFile = formData.get('image') as File | null;

  const supabase = createServerSupabase();
  let imagePath: string | undefined;

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('mug-shapes')
      .upload(path, imageFile, { upsert: true, contentType: imageFile.type });
    if (uploadError) return { error: uploadError.message };
    imagePath = path;
  }

  const { error } = await supabase.from('mug_shapes').insert({
    name,
    slug,
    description,
    ...(imagePath ? { image_path: imagePath } : {}),
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
  return {};
}

export async function toggleShapeActive(id: string, active: boolean) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase.from('mug_shapes').update({ active }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}

export async function deleteShape(id: string) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase.from('mug_shapes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}

// ─── Mug sizes ───────────────────────────────────────────────────────────────

export async function addSize(_prev: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const name = (formData.get('name') as string | null)?.trim();
  const priceStr = (formData.get('price') as string | null)?.trim();
  const sortStr = (formData.get('sort_order') as string | null)?.trim();
  if (!name) return { error: 'Name is required.' };
  const pricePence = Math.round(parseFloat(priceStr ?? '0') * 100);
  if (!Number.isFinite(pricePence) || pricePence <= 0) return { error: 'Enter a valid price.' };
  const sortOrder = parseInt(sortStr ?? '0', 10) || 0;
  const supabase = createServerSupabase();
  const { error } = await supabase.from('mug_sizes').insert({ name, price_pence: pricePence, sort_order: sortOrder });
  if (error) return { error: error.message };
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
  return {};
}

export async function updateSizePrice(id: string, pricePence: number) {
  await requireAdminUser();
  if (!Number.isInteger(pricePence) || pricePence <= 0) throw new Error('Invalid price');
  const supabase = createServerSupabase();
  const { error } = await supabase.from('mug_sizes').update({ price_pence: pricePence }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}

export async function toggleSizeActive(id: string, active: boolean) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase.from('mug_sizes').update({ active }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}

export async function deleteSize(id: string) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase.from('mug_sizes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}

// ─── Glaze tile images ────────────────────────────────────────────────────────

export async function uploadGlazeTile(_prev: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const slug1 = (formData.get('slug1') as string | null)?.trim().toLowerCase();
  const slug2 = (formData.get('slug2') as string | null)?.trim().toLowerCase();
  const file = formData.get('image') as File | null;

  if (!slug1 || !slug2) return { error: 'Both glaze slugs are required.' };
  if (!file || file.size === 0) return { error: 'Image is required.' };
  if (slug1 === slug2) return { error: 'Base and accent glazes must be different.' };

  const [a, b] = [slug1, slug2].sort();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${a}-${b}.${ext}`;

  const supabase = createServerSupabase();
  const { error } = await supabase.storage
    .from('glaze-tiles')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return { error: error.message };
  revalidatePath('/custom-mug');
  return { success: `Uploaded as ${path}` };
}

// ─── Mug example images ───────────────────────────────────────────────────────

export async function uploadMugExample(_prev: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const file = formData.get('image') as File | null;
  if (!file || file.size === 0) return { error: 'Image is required.' };
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const supabase = createServerSupabase();
  const { error } = await supabase.storage
    .from('mug-examples')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return { error: error.message };
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
  return {};
}

export async function deleteMugExample(path: string) {
  await requireAdminUser();
  const supabase = createServerSupabase();
  const { error } = await supabase.storage.from('mug-examples').remove([path]);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/custom-mug');
  revalidatePath('/custom-mug');
}
