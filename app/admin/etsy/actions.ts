'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import { createServerSupabase } from '@/app/_lib/supabase';
import { getStripe } from '@/app/_lib/stripe';

function parseStoragePath(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function deleteAllProducts(): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const supabase = createServerSupabase();
    const stripe = getStripe();
    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, stripe_product_id, image_url');

    if (fetchError) return { success: false, error: fetchError.message };
    if (!products?.length) return { success: true };

    // Clean up storage + Stripe for each product
    for (const product of products) {
      // Gallery images folder
      const folder = `${product.id}/`;
      const { data: files } = await supabase.storage
        .from('product-images')
        .list(folder, { sortBy: { column: 'name', order: 'asc' } });
      if (files?.length) {
        const paths = files
          .filter((f) => !f.name.startsWith('.'))
          .map((f) => `${folder}${f.name}`);
        if (paths.length) await supabase.storage.from('product-images').remove(paths);
      }

      // Cover image
      if (product.image_url) {
        const path = parseStoragePath(product.image_url, 'product-images');
        if (path) await supabase.storage.from('product-images').remove([path]);
      }

      // Archive Stripe product (non-fatal)
      if (product.stripe_product_id) {
        try {
          await stripe.products.update(
            product.stripe_product_id,
            { active: false },
            stripeOpts,
          );
        } catch {
          // ignore — product may already be deleted in Stripe
        }
      }
    }

    // Delete all rows from Supabase
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .not('id', 'is', null);

    if (deleteError) return { success: false, error: deleteError.message };

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/admin/edit-product');

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
