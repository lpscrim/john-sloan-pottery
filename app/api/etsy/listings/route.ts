import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { fetchActiveListings } from '@/app/_lib/etsy';
import { createServerSupabase } from '@/app/_lib/supabase';

export async function GET() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerSupabase();
    const [listings, { data: linked }] = await Promise.all([
      fetchActiveListings(),
      supabase
        .from('products')
        .select('etsy_listing_id')
        .not('etsy_listing_id', 'is', null),
    ]);

    const importedIds = new Set((linked ?? []).map((p) => String(p.etsy_listing_id)));

    const enriched = listings.map((l) => ({
      listing_id: l.listing_id,
      title: l.title,
      description: l.description,
      price_pence: Math.round((l.price.amount / l.price.divisor) * 100),
      quantity: l.quantity,
      image_url: l.images?.[0]?.url_fullxfull ?? null,
      etsy_url: l.url,
      already_imported: importedIds.has(String(l.listing_id)),
    }));

    return NextResponse.json({ listings: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
