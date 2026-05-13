import { createServerSupabase } from '@/app/_lib/supabase';
import EditProductClient from './EditProductClient';
import type { AdminProduct } from './types';
import { getGlazes, getMugShapes } from '@/app/_lib/customMug';

async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = createServerSupabase();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price_hw, stock_level, categories, glaze, image_url, stripe_product_id, stripe_price_id, mug_shape_slug, shape_label')
    .order('id', { ascending: true });

  if (error || !products) {
    console.error('Failed to fetch products:', error);
    return [];
  }

  const adminProducts: AdminProduct[] = await Promise.all(
    products.map(async (product) => {
      const folder = `${product.id}/`;
      const { data: files } = await supabase.storage
        .from('product-images')
        .list(folder, { sortBy: { column: 'name', order: 'asc' } });

      const gallery = (files ?? [])
        .filter((f) => !f.name.startsWith('.'))
        .map((f) => {
          const path = `${folder}${f.name}`;
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(path);
          return { path, url: urlData.publicUrl };
        });

      return {
        id: String(product.id),
        name: product.name ?? '',
        description: product.description ?? '',
        price_hw: product.price_hw ?? 0,
        stock_level: product.stock_level ?? 0,
        categories: product.categories ?? [],
        glaze: (product.glaze ?? []) as AdminProduct['glaze'],
        image_url: product.image_url ?? '',
        stripe_product_id: product.stripe_product_id ?? null,
        stripe_price_id: product.stripe_price_id ?? null,
        gallery,
        mug_shape_slug: product.mug_shape_slug ?? null,
        shape_label: product.shape_label ?? null,
      };
    })
  );

  return adminProducts;
}

export default async function EditProductPage() {
  const [products, shapes, glazes] = await Promise.all([getAdminProducts(), getMugShapes(), getGlazes()]);
  return <EditProductClient products={products} shapes={shapes} glazes={glazes} />;
}
