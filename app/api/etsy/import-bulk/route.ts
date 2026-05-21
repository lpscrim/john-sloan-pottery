import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/app/_lib/supabase';
import { getStripe } from '@/app/_lib/stripe';

/**
 * One-time bulk import of Etsy listings into Supabase + Stripe.
 * Called by Make.com with the raw Etsy GET /listings response body.
 * Authorization: Bearer <ETSY_WEBHOOK_SECRET>
 */

interface EtsyImage {
  url_fullxfull?: string;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  quantity: number;
  price: { amount: number; divisor: number; currency_code: string };
  images?: EtsyImage[] | null;
  url: string;
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

  const supabase = createServerSupabase();
  const stripe = getStripe();
  const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
  const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

  // Fetch already-imported listing IDs
  const { data: existing } = await supabase
    .from('products')
    .select('etsy_listing_id')
    .not('etsy_listing_id', 'is', null);
  const importedIds = new Set((existing ?? []).map((p) => String(p.etsy_listing_id)));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const listing of listings) {
    const listingId = String(listing.listing_id);
    if (importedIds.has(listingId)) {
      skipped++;
      continue;
    }

    const pricePence = Math.round((listing.price.amount / listing.price.divisor) * 100);
    const imageUrl = listing.images?.[0]?.url_fullxfull ?? null;

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name: listing.title,
        description: listing.description ?? '',
        price_hw: pricePence,
        image_url: imageUrl ?? '',
        stock_level: listing.quantity ?? 0,
        categories: [],
        medium: '',
        glaze: [],
        type: 'pottery',
        etsy_listing_id: listingId,
      })
      .select()
      .single();

    if (insertError || !product) {
      errors.push(`${listingId}: ${insertError?.message ?? 'DB insert failed'}`);
      continue;
    }

    try {
      const stripeProduct = await stripe.products.create(
        {
          name: listing.title,
          description: listing.description ?? '',
          images: imageUrl ? [imageUrl] : [],
        },
        stripeOpts,
      );
      const stripePrice = await stripe.prices.create(
        { product: stripeProduct.id, unit_amount: pricePence, currency: 'gbp' },
        stripeOpts,
      );
      await supabase
        .from('products')
        .update({ stripe_product_id: stripeProduct.id, stripe_price_id: stripePrice.id })
        .eq('id', product.id);
    } catch (stripeErr) {
      errors.push(`${listingId}: Stripe failed — ${stripeErr instanceof Error ? stripeErr.message : 'unknown'}`);
    }

    imported++;
  }

  if (imported > 0) {
    revalidatePath('/');
    revalidatePath('/work');
  }

  return NextResponse.json({ imported, skipped, errors });
}
