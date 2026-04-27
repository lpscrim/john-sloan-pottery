import { NextRequest, NextResponse } from 'next/server';
import { fetchListingInventory, updateListingInventory } from '@/app/_lib/etsy';
import { createServerSupabase } from '@/app/_lib/supabase';

/**
 * Two-way Etsy stock sync — called by Vercel Cron every 10 minutes.
 *
 * Logic per linked product:
 *   - Etsy qty < app stock_level → Etsy sale detected → reduce app stock to match
 *   - app stock_level < Etsy qty → app sale pushed to Etsy (or manual correction)
 *   - Equal → no action
 */
export async function GET(req: NextRequest) {
  // Verify cron secret when configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

  type SyncResult = { listing_id: string; action: string; from: number; to: number };
  const results: SyncResult[] = [];
  const errors: string[] = [];

  for (const product of products) {
    try {
      const listingId = parseInt(product.etsy_listing_id as string, 10);
      const inventory = await fetchListingInventory(listingId);

      // Sum quantity across all offerings (handles simple and variation listings)
      const etsyQty = inventory.products.reduce(
        (sum, p) => sum + p.offerings.reduce((s, o) => s + o.quantity, 0),
        0,
      );

      const appQty: number = product.stock_level ?? 0;

      if (etsyQty < appQty) {
        // Etsy had a sale — bring app stock down to match
        await supabase
          .from('products')
          .update({ stock_level: etsyQty })
          .eq('id', product.id);
        results.push({
          listing_id: product.etsy_listing_id as string,
          action: 'etsy_sale_detected',
          from: appQty,
          to: etsyQty,
        });
      } else if (appQty < etsyQty) {
        // App stock is lower — push that value to Etsy
        await updateListingInventory(listingId, appQty);
        results.push({
          listing_id: product.etsy_listing_id as string,
          action: 'pushed_to_etsy',
          from: etsyQty,
          to: appQty,
        });
      }
      // If equal, nothing to do
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ETSY POLL] Failed for product ${product.id}:`, msg);
      errors.push(`product ${product.id}: ${msg}`);
    }
  }

  return NextResponse.json({ synced: results.length, results, errors });
}
