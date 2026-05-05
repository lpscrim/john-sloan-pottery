import { NextRequest, NextResponse } from 'next/server';
import { fetchListingInventory, updateListingInventory } from '@/app/_lib/etsy';
import { createServerSupabase } from '@/app/_lib/supabase';

/**
 * Two-way Etsy stock sync — called by cron-job.org every minute (GitHub Actions as backup).
 *
 * Logic per linked product:
 *   - Etsy qty < app stock_level → Etsy sale detected → reduce app stock to match
 *   - app stock_level < Etsy qty → app sale pushed to Etsy (or manual correction)
 *   - Equal → no action
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Soft concurrency guard — skip if another sync started within the last 30 seconds
  const { data: lockRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'etsy_sync_last_started_at')
    .single();
  const lastStarted = lockRow ? parseInt(lockRow.value ?? '0', 10) : 0;
  if (Date.now() - lastStarted < 30_000) {
    return NextResponse.json({ synced: 0, message: 'Sync skipped: another sync started recently' });
  }
  await supabase
    .from('settings')
    .upsert({ key: 'etsy_sync_last_started_at', value: String(Date.now()) }, { onConflict: 'key' });
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

  // Process in batches of 5 to parallelise within Etsy's rate limit (~10 req/s)
  const BATCH_SIZE = 5;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (product) => {
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
            // App stock is lower — push that value to Etsy (reuse already-fetched inventory)
            await updateListingInventory(listingId, appQty, inventory);
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
      })
    );
  }

  return NextResponse.json({ synced: results.length, results, errors });
}
