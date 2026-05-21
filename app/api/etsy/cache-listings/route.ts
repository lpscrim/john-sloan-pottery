import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/app/_lib/supabase';

/**
 * Receives all active Etsy listings from Make.com and caches them in the
 * settings table so the admin can browse and selectively import them.
 * Authorization: Bearer <ETSY_WEBHOOK_SECRET>
 */

interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  quantity: number;
  price: { amount: number; divisor: number };
  images?: { url_fullxfull?: string }[] | null;
  videos?: { video_url?: string | null; state?: string }[] | null;
  url: string;
}

export interface SimplifiedListing {
  listing_id: number;
  title: string;
  description: string;
  quantity: number;
  price_pence: number;
  image_url: string | null;
  image_urls: string[];
  video_url: string | null;
  etsy_url: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.ETSY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'ETSY_WEBHOOK_SECRET not configured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = body as Record<string, unknown>;
  const listings = (parsed?.results ?? parsed?.listings) as EtsyListing[] | undefined;
  if (!Array.isArray(listings) || listings.length === 0) {
    return NextResponse.json({ error: 'Missing or empty listings array' }, { status: 400 });
  }

  const simplified = listings.map((l) => {
    const imageUrls = (l.images ?? [])
      .map((img) => img.url_fullxfull)
      .filter((u): u is string => Boolean(u));
    // Take the first video with a non-empty URL, regardless of state
    const videoUrl = (l.videos ?? [])
      .find((v) => v.video_url)?.video_url ?? null;
    return {
      listing_id: l.listing_id,
      title: l.title,
      description: l.description ?? '',
      quantity: l.quantity ?? 0,
      price_pence: Math.round((l.price.amount / l.price.divisor) * 100),
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      video_url: videoUrl,
      etsy_url: l.url,
    };
  });

  const withVideos = simplified.filter((l) => l.video_url).length;
  // Debug: log a sample of what Etsy sent for the first listing with videos
  const firstWithVideo = listings.find((l) => (l.videos ?? []).length > 0);
  if (firstWithVideo) {
    console.log('[cache-listings] First listing with videos array:', JSON.stringify(firstWithVideo.videos?.slice(0, 1)));
  } else {
    console.log('[cache-listings] No listings had a videos array. Sample listing keys:', Object.keys(listings[0] ?? {}));
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'etsy_listings_cache', value: JSON.stringify(simplified) });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cached: simplified.length, with_videos: withVideos });
}
