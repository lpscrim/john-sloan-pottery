import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { createServerSupabase } from '@/app/_lib/supabase';

/**
 * Returns cached Etsy listings (stored by Make.com) along with
 * which ones have already been imported onto the website.
 */

export interface CachedListing {
  listing_id: number;
  title: string;
  description: string;
  quantity: number;
  price_pence: number;
  image_url: string | null;
  image_urls: string[];
  video_url: string | null;
  etsy_url: string;
  already_imported: boolean;
}

export async function GET() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const [{ data: cacheSetting }, { data: imported }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'etsy_listings_cache').maybeSingle(),
    supabase.from('products').select('etsy_listing_id').not('etsy_listing_id', 'is', null),
  ]);

  if (!cacheSetting?.value) {
    return NextResponse.json({ listings: [], cached_at: null });
  }

  const importedIds = new Set((imported ?? []).map((p) => String(p.etsy_listing_id)));

  let listings: CachedListing[] = [];
  try {
    const raw = JSON.parse(cacheSetting.value) as Omit<CachedListing, 'already_imported'>[];
    listings = raw.map((l) => ({
      ...l,
      image_urls: l.image_urls ?? (l.image_url ? [l.image_url] : []),
      video_url: l.video_url ?? null,
      already_imported: importedIds.has(String(l.listing_id)),
    }));
  } catch {
    return NextResponse.json({ error: 'Cache parse error' }, { status: 500 });
  }

  return NextResponse.json({ listings });
}
