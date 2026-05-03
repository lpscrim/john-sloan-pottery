import { createServerSupabase } from './supabase';

export interface Glaze {
  id: string;
  name: string;
  slug: string;
}

export interface MugShape {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface MugSize {
  id: string;
  name: string;
  price_pence: number;
  sort_order: number;
}

export async function getGlazes(): Promise<Glaze[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('glazes')
    .select('id, name, slug')
    .eq('active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMugShapes(): Promise<MugShape[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('mug_shapes')
    .select('id, name, slug, description')
    .eq('active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMugSizes(): Promise<MugSize[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('mug_sizes')
    .select('id, name, price_pence, sort_order')
    .eq('active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMugExampleUrls(): Promise<string[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage
    .from('mug-examples')
    .list('', { limit: 30, sortBy: { column: 'name', order: 'asc' } });
  if (error || !data) return [];
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return data
    .filter((f) => !f.name.startsWith('.') && f.id !== null)
    .map((f) => `${base}/storage/v1/object/public/mug-examples/${f.name}`);
}

/** Deterministic tile image URL — slugs are always sorted alphabetically. */
export function tileImageUrl(slug1: string, slug2: string): string {
  const [a, b] = [slug1, slug2].sort();
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/glaze-tiles/${a}-${b}.jpg`;
}

export function shapeImageUrl(slug: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mug-shapes/${slug}.jpg`;
}
