import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/app/_lib/supabase';

/**
 * Called by Make.com when an Etsy receipt is created (item sold on Etsy).
 * Sets the matching product's stock_level to 0 in Supabase.
 *
 * Expected body: { listing_id: number | string }
 * Authorization: Bearer <ETSY_WEBHOOK_SECRET>
 */
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

  const listingId = (body as Record<string, unknown>)?.listing_id;
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('products')
    .update({ stock_level: 0 })
    .eq('etsy_listing_id', String(listingId))
    .select('id, title');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[ETSY SOLD] listing ${listingId} → stock set to 0`, data);
  return NextResponse.json({ updated: data?.length ?? 0 });
}
