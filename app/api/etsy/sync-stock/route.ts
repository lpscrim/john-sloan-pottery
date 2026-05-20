import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/app/_lib/supabase';

/**
 * Called by Make.com on a schedule (every 4 hours) with current Etsy listing quantities.
 * Reduces Supabase stock where Etsy quantity is lower (Etsy sale detected).
 * Never increases Supabase stock — website is source of truth for additions.
 *
 * Expected body: { listings: Array<{ listing_id: number | string; quantity: number }> }
 * Authorization: Bearer <ETSY_WEBHOOK_SECRET>
 */

interface ListingQuantity {
  listing_id: number | string;
  quantity: number;
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

  const listings = (body as Record<string, unknown>)?.listings as ListingQuantity[] | undefined;
  if (!Array.isArray(listings) || listings.length === 0) {
    return NextResponse.json({ error: 'Missing or empty listings array' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, stock_level, etsy_listing_id')
    .not('etsy_listing_id', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No Etsy-linked products found' });
  }

  const etsyMap = new Map<string, number>(
    listings.map((l) => [String(l.listing_id), l.quantity]),
  );

  let synced = 0;
  const results: { listing_id: string; from: number; to: number }[] = [];

  for (const product of products) {
    const listingId = String(product.etsy_listing_id);
    const etsyQty = etsyMap.get(listingId);
    if (etsyQty === undefined) continue;

    const appQty: number = product.stock_level ?? 0;
    if (etsyQty < appQty) {
      await supabase
        .from('products')
        .update({ stock_level: etsyQty })
        .eq('id', product.id);
      results.push({ listing_id: listingId, from: appQty, to: etsyQty });
      synced++;
    }
  }

  return NextResponse.json({ synced, results });
}
