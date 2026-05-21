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
    image_urls?: string[];
    image_url?: string | null;
    video_url?: string | null;
  };

  const { listing_id, title, description, price_pence, quantity } = body;
  const imageUrls = body.image_urls?.filter(Boolean) ??
    (body.image_url ? [body.image_url] : []);
  const videoUrl = body.video_url ?? null;

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

  // ---------- Download and upload images to Supabase Storage ----------
  async function uploadImageFromUrl(url: string, storagePath: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const { error } = await supabase.storage
        .from('product-images')
        .upload(storagePath, buffer, { contentType, upsert: false });
      if (error) return null;
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(storagePath);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  }

  // Insert row first to get the product ID (needed for gallery paths)
  const { data: product, error: insertError } = await supabase
    .from('products')
    .insert({
      name: title,
      description: description ?? '',
      price_hw: price_pence,
      image_url: imageUrls[0] ?? '',
      stock_level: quantity ?? 0,
      categories: [],
      medium: '',
      glaze: [],
      type: 'pottery',
      etsy_listing_id: String(listing_id),
      video_url: videoUrl,
    })
    .select()
    .single();

  if (insertError || !product) {
    return NextResponse.json(
      { error: insertError?.message ?? 'DB insert failed' },
      { status: 500 },
    );
  }

  // ---------- Upload images to Supabase Storage ----------
  let coverStorageUrl: string | null = null;
  if (imageUrls.length > 0) {
    // Cover image
    const coverExt = imageUrls[0].split('.').pop()?.split('?')[0] ?? 'jpg';
    const coverPath = `uploads/${Date.now()}_${crypto.randomUUID()}.${coverExt}`;
    coverStorageUrl = await uploadImageFromUrl(imageUrls[0], coverPath);

    // Gallery images (indices 1+)
    const galleryUrls = imageUrls.slice(1);
    await Promise.all(
      galleryUrls.map(async (url, i) => {
        const ext = url.split('.').pop()?.split('?')[0] ?? 'jpg';
        const idx = String(i).padStart(2, '0');
        const path = `${product.id}/${idx}_${crypto.randomUUID()}.${ext}`;
        await uploadImageFromUrl(url, path);
      }),
    );

    if (coverStorageUrl) {
      await supabase.from('products').update({ image_url: coverStorageUrl }).eq('id', product.id);
    }
  }

  const finalImageUrl = coverStorageUrl ?? imageUrls[0] ?? null;

  // Create matching Stripe product + price
  try {
    const stripe = getStripe();
    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

    const stripeProduct = await stripe.products.create(
      {
        name: title,
        description: description ?? '',
        images: finalImageUrl ? [finalImageUrl] : [],
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
