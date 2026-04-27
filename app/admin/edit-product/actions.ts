'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/app/_lib/supabase';
import { getStripe } from '@/app/_lib/stripe';
import { requireAdminUser } from '@/app/_lib/adminAuth';

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];

function isAllowedImageFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

export interface UpdateProductState {
  success: boolean;
  error?: string;
}

export interface DeleteProductState {
  success: boolean;
  error?: string;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_SECONDARY = 4;

function parseStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  } catch {
    return null;
  }
}

export async function updateProduct(
  _prev: UpdateProductState,
  formData: FormData
): Promise<UpdateProductState> {
  try {
    await requireAdminUser();
    const productIdStr = formData.get('productId') as string | null;
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    const priceStr = formData.get('price') as string | null;
    const stockStr = formData.get('stock') as string | null;
    const categoriesRaw = formData.get('categories') as string | null;
    const medium = formData.get('medium') as string | null;
    const dimensions = formData.get('dimensions') as string | null;
    const year = formData.get('year') as string | null;
    const removeCover = formData.get('removeCover') === 'on';
    const removeGallery = formData.getAll('removeGallery') as string[];
    const imageFile = formData.get('image') as File | null;
    const secondaryFiles = formData.getAll('secondary') as File[];

    const productId = productIdStr?.trim();
    if (!productId) return { success: false, error: 'Invalid product ID.' };
    if (!name?.trim()) return { success: false, error: 'Name is required.' };

    const priceHw = Math.round(parseFloat(priceStr ?? '') * 100);
    if (!priceStr?.trim() || Number.isNaN(priceHw) || priceHw <= 0) {
      return { success: false, error: 'Price must be a positive number.' };
    }

    const stockLevel = stockStr ? parseInt(stockStr, 10) : 0;
    if (Number.isNaN(stockLevel) || stockLevel < 0) {
      return { success: false, error: 'Stock must be a non-negative integer.' };
    }

    if (imageFile && imageFile.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Cover image exceeds 15 MB limit.' };
    }

    if (imageFile && imageFile.size > 0 && !isAllowedImageFile(imageFile)) {
      return { success: false, error: 'Cover image must be a JPG, PNG, WebP, AVIF, or GIF.' };
    }

    const validSecondary = secondaryFiles.filter((f) => f.size > 0);
    if (validSecondary.length > MAX_SECONDARY) {
      return { success: false, error: 'You can upload a maximum of 4 gallery images.' };
    }

    const oversized = validSecondary.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      return { success: false, error: `Gallery image "${oversized.name}" exceeds 15 MB limit.` };
    }

    const invalidType = validSecondary.find((f) => !isAllowedImageFile(f));
    if (invalidType) {
      return { success: false, error: `Gallery image "${invalidType.name}" is not an allowed image type.` };
    }

    const categories = categoriesRaw
      ? categoriesRaw.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    const supabase = createServerSupabase();
    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (existingError || !existing) {
      return { success: false, error: 'Product not found.' };
    }

    let imageUrl: string = existing.image_url ?? '';

    if ((removeCover || (imageFile && imageFile.size > 0)) && imageUrl) {
      const path = parseStoragePath(imageUrl, 'product-images');
      if (path) {
        await supabase.storage.from('product-images').remove([path]);
      }
      imageUrl = '';
    }

    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split('.').pop() ?? 'webp';
      const storagePath = `uploads/${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        return { success: false, error: `Image upload failed: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);
      imageUrl = urlData.publicUrl;
    }

    if (removeGallery.length > 0) {
      await supabase.storage.from('product-images').remove(removeGallery);
    }

    if (validSecondary.length > 0) {
      for (let i = 0; i < validSecondary.length; i++) {
        const file = validSecondary[i];
        const ext = file.name.split('.').pop() ?? 'webp';
        const storagePath = `${productId}/${Date.now()}_${crypto.randomUUID()}_${i}.${ext}`;
        await supabase.storage
          .from('product-images')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });
      }
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        description: (description ?? '').trim(),
        price_hw: priceHw,
        stock_level: stockLevel,
        categories,
        medium: (medium ?? '').trim(),
        dimensions: (dimensions ?? '').trim(),
        year: year?.trim() || new Date().getFullYear().toString(),
        image_url: imageUrl,
        type: 'pottery',
      })
      .eq('id', productId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (existing.stripe_product_id) {
      const stripe = getStripe();
      await stripe.products.update(existing.stripe_product_id, {
        name: name.trim(),
        description: (description ?? '').trim() || undefined,
        images: imageUrl ? [imageUrl] : [],
      });

      if (existing.price_hw !== priceHw) {
        const stripePrice = await stripe.prices.create({
          product: existing.stripe_product_id,
          unit_amount: priceHw,
          currency: 'gbp',
        });

        if (existing.stripe_price_id) {
          await stripe.prices.update(existing.stripe_price_id, { active: false });
        }

        await supabase
          .from('products')
          .update({ stripe_price_id: stripePrice.id })
          .eq('id', productId);
      }
    }

    revalidatePath('/');
    revalidatePath('/work');
    revalidatePath('/admin/edit-product');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function deleteProduct(
  _prev: DeleteProductState,
  formData: FormData
): Promise<DeleteProductState> {
  try {
    await requireAdminUser();
    const productIdStr = formData.get('productId') as string | null;
    const productId = productIdStr?.trim();
    if (!productId) return { success: false, error: 'Invalid product ID.' };

    const supabase = createServerSupabase();
    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (existingError || !existing) {
      return { success: false, error: 'Product not found.' };
    }

    if (existing.image_url) {
      const path = parseStoragePath(existing.image_url, 'product-images');
      if (path) {
        await supabase.storage.from('product-images').remove([path]);
      }
    }

    const folder = `${productId}/`;
    const { data: files } = await supabase.storage
      .from('product-images')
      .list(folder, { sortBy: { column: 'name', order: 'asc' } });

    if (files && files.length > 0) {
      const paths = files
        .filter((f) => !f.name.startsWith('.'))
        .map((f) => `${folder}${f.name}`);
      if (paths.length > 0) {
        await supabase.storage.from('product-images').remove(paths);
      }
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) return { success: false, error: deleteError.message };

    if (existing.stripe_product_id) {
      const stripe = getStripe();
      await stripe.products.update(existing.stripe_product_id, { active: false });
    }

    revalidatePath('/');
    revalidatePath('/work');
    revalidatePath('/admin/edit-product');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
