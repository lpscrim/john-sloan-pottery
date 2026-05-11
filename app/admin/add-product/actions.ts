'use server';

import { createServerSupabase } from '@/app/_lib/supabase';
import { getStripe } from '@/app/_lib/stripe';
import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/app/_lib/adminAuth';

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];

function isAllowedImageFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

export interface AddProductState {
  success: boolean;
  error?: string;
  productId?: string;
}

/**
 * Server Action — handles the admin "Add Product" form.
 *
 * 1. Uploads the image to Supabase Storage (`product-images` bucket).
 * 2. Inserts a row in the `products` table.
 * 3. Creates a matching Product + Price in Stripe.
 * 4. Updates the Supabase row with `stripe_product_id` & `stripe_price_id`.
 * 5. Revalidates cached pages.
 */
export async function addProduct(
  _prev: AddProductState,
  formData: FormData
): Promise<AddProductState> {
  try {
    await requireAdminUser();
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    const priceStr = formData.get('price') as string | null;
    const stockStr = formData.get('stock') as string | null;
    const imageFile = formData.get('image') as File | null;
    const categoriesRaw = formData.get('categories') as string | null;
    const glaze = [0, 1, 2]
      .map((i) => ({
        name: ((formData.get(`glaze_${i}_name`) as string | null) ?? '').trim(),
        note: ((formData.get(`glaze_${i}_note`) as string | null) ?? '').trim(),
        colour: ((formData.get(`glaze_${i}_colour`) as string | null) ?? '').trim() || undefined,
        slug: ((formData.get(`glaze_${i}_slug`) as string | null) ?? '').trim() || undefined,
      }))
      .filter((g) => g.name);
    const mugShapeSlug = ((formData.get('mug_shape_slug') as string | null) ?? '').trim() || null;
    const shapeLabel = ((formData.get('shape_label') as string | null) ?? '').trim() || null;
    const secondaryFiles = formData.getAll('secondary') as File[];

    // ---------- Validation ----------
    if (!name?.trim()) return { success: false, error: 'Name is required.' };

    if (imageFile && imageFile.size > 4 * 1024 * 1024)
      return { success: false, error: 'Cover image exceeds 4 MB limit.' };

    if (imageFile && imageFile.size > 0 && !isAllowedImageFile(imageFile))
      return { success: false, error: 'Cover image must be a JPG, PNG, WebP, AVIF, or GIF.' };

    const validSecondary = secondaryFiles.filter(f => f.size > 0);
    if (validSecondary.length > 4)
      return { success: false, error: 'You can upload a maximum of 4 gallery images.' };

    const oversized = validSecondary.find(f => f.size > 4 * 1024 * 1024);
    if (oversized)
      return { success: false, error: `Gallery image "${oversized.name}" exceeds 4 MB limit.` };

    const invalidType = validSecondary.find(f => !isAllowedImageFile(f));
    if (invalidType)
      return { success: false, error: `Gallery image "${invalidType.name}" is not an allowed image type.` };
    if (!priceStr?.trim()) return { success: false, error: 'Price is required.' };

    const priceHw = Math.round(parseFloat(priceStr) * 100); // pounds → pence
    if (Number.isNaN(priceHw) || priceHw <= 0)
      return { success: false, error: 'Price must be a positive number.' };

    const stockLevel = stockStr ? parseInt(stockStr, 10) : 0;
    if (Number.isNaN(stockLevel) || stockLevel < 0)
      return { success: false, error: 'Stock must be a non-negative integer.' };

    const categories = categoriesRaw
      ? categoriesRaw.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    // ---------- Supabase setup ----------
    const supabase = createServerSupabase();
    let imageUrl = '';

    // ---------- Image upload ----------
    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split('.').pop() ?? 'webp';
      const storagePath = `uploads/${Date.now()}_${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError)
        return { success: false, error: `Image upload failed: ${uploadError.message}` };

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      imageUrl = urlData.publicUrl;
    }

    // ---------- Insert row in Supabase ----------
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        description: (description ?? '').trim(),
        price_hw: priceHw,
        image_url: imageUrl,
        stock_level: stockLevel,
        categories,
        glaze,
        type: 'pottery',
        ...(mugShapeSlug ? { mug_shape_slug: mugShapeSlug } : {}),
        ...(shapeLabel ? { shape_label: shapeLabel } : {}),
      })
      .select()
      .single();

    if (insertError || !product)
      return { success: false, error: `DB insert failed: ${insertError?.message}` };

    // ---------- Create product + price in Stripe ----------
    const stripe = getStripe();

    let stripeProduct;
    let stripePrice;
    try {
      stripeProduct = await stripe.products.create({
        name: name.trim(),
        description: (description ?? '').trim() || undefined,
        images: imageUrl ? [imageUrl] : undefined,
        metadata: { supabase_id: product.id },
      });

      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: priceHw,
        currency: 'gbp',
      });
    } catch (stripeError) {
      // Clean up the orphaned Supabase row
      await supabase.from('products').delete().eq('id', product.id);
      return {
        success: false,
        error: `Stripe creation failed: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`,
      };
    }

    // ---------- Store Stripe IDs back in Supabase ----------
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
      })
      .eq('id', product.id);

    if (updateError)
      console.error('Failed to save Stripe IDs:', updateError.message);

    // ---------- Upload secondary (gallery) images ----------
    if (validSecondary.length > 0) {
      for (let i = 0; i < validSecondary.length; i++) {
        const file = validSecondary[i];
        const ext = file.name.split('.').pop() ?? 'webp';
        // Store under product-images/{productId}/ so fetchProductGalleryImages picks them up
        const storagePath = `${product.id}/${String(i).padStart(2, '0')}_${crypto.randomUUID()}.${ext}`;

        const { error: secUploadError } = await supabase.storage
          .from('product-images')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (secUploadError)
          console.error(`Failed to upload gallery image ${i + 1}:`, secUploadError.message);
      }
    }

    // ---------- Revalidate ----------
    revalidatePath('/');
    revalidatePath('/work');

    return { success: true, productId: product.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
