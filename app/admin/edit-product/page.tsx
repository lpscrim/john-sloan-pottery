import { createServerSupabase } from '@/app/_lib/supabase';
import EditProductClient from './EditProductClient';
import type { AdminProduct } from './types';

async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = createServerSupabase();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price_hw, stock_level, categories, medium, dimensions, year, image_url, stripe_product_id, stripe_price_id')
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
        medium: product.medium ?? '',
        dimensions: product.dimensions ?? '',
        year: product.year ?? new Date().getFullYear().toString(),
        image_url: product.image_url ?? '',
        stripe_product_id: product.stripe_product_id ?? null,
        stripe_price_id: product.stripe_price_id ?? null,
        gallery,
      };
    })
  );

  return adminProducts;
}

export default async function EditProductPage() {
  const products = await getAdminProducts();
  return <EditProductClient products={products} />;
}
