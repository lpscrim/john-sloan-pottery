import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { createServerSupabase } from '@/app/_lib/supabase';
import { getStripe } from '@/app/_lib/stripe';

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    listing_id: number;
    title: string;
    description: string;
    price_pence: number;
    quantity: number;
    image_url: string | null;
  };

  const { listing_id, title, description, price_pence, quantity, image_url } = body;

  if (!listing_id || !title || !price_pence) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Guard against duplicate import
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('etsy_listing_id', String(listing_id))
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already imported' }, { status: 409 });
  }

  const { data: product, error: insertError } = await supabase
    .from('products')
    .insert({
      name: title,
      description: description ?? '',
      price_hw: price_pence,
      image_url: image_url ?? '',
      stock_level: quantity ?? 0,
      categories: [],
      medium: '',
      glaze: [],
      type: 'pottery',
      etsy_listing_id: String(listing_id),
    })
    .select()
    .single();

  if (insertError || !product) {
    return NextResponse.json(
      { error: insertError?.message ?? 'DB insert failed' },
      { status: 500 },
    );
  }

  // Create matching Stripe product + price
  try {
    const stripe = getStripe();
    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

    const stripeProduct = await stripe.products.create(
      {
        name: title,
        description: description ?? '',
        images: image_url ? [image_url] : [],
      },
      stripeOpts,
    );
    const stripePrice = await stripe.prices.create(
      { product: stripeProduct.id, unit_amount: price_pence, currency: 'gbp' },
      stripeOpts,
    );

    await supabase
      .from('products')
      .update({ stripe_product_id: stripeProduct.id, stripe_price_id: stripePrice.id })
      .eq('id', product.id);
  } catch (stripeErr) {
    // Product is in DB — Stripe failure is non-fatal; admin can set Stripe IDs later
    console.error('[ETSY IMPORT] Stripe setup failed:', stripeErr);
    return NextResponse.json({
      success: true,
      product_id: product.id,
      warning: 'Imported but Stripe product creation failed. Set Stripe IDs manually.',
    });
  }

  revalidatePath('/');
  revalidatePath('/work');
  return NextResponse.json({ success: true, product_id: product.id });
}
