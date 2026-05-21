import { createClient } from '@supabase/supabase-js';

export interface GlazeEntry {
  name: string;  // customer-facing label, e.g. "r1"
  note: string;  // description sent to John on order, e.g. "Rutile reduction"
  colour?: string; // basic colour category for filtering, e.g. "green"
  slug?: string; // matches slug on glazes table for custom mug linking
}

export interface Project {
  id: number;
  title: string;
  categories: string[];
  glaze: GlazeEntry[];
  imageUrl: string;       // Supabase Storage public URL
  galleryImages?: string[];
  text: string;
  price_hw: number;       // price in cents
  stock_level: number;
  stripe_price_id: string | null;
  mug_shape_slug?: string; // if set, sold-out button links to custom mug builder
  shape_label?: string;   // display label for the shape/style (set even when not in Build a Mug)
  etsy_listing_id?: string | null;
  video_url?: string | null;
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Fetch all projects from the Supabase `products` table.
 *
 * Each row is expected to have at minimum:
 *   id, name, description, price_hw, image_url, stock_level,
 *   stripe_product_id, stripe_price_id, categories, year
 *
 * For gallery images we look in Supabase Storage under the
 * `product-images/{product_id}/` prefix.
 */
export async function getProjects(): Promise<Project[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error || !products) {
    console.error('Failed to fetch products from Supabase:', error);
    return [];
  }

  const projects: Project[] = await Promise.all(
    products.map(async (product) => {
      // Fetch gallery images from Supabase Storage bucket
      const galleryImages = await fetchProductGalleryImages(
        supabase,
        product.id
      );

      return {
        id: product.id,
        title: (product.name ?? ''),
        categories: product.categories ?? [],
        glaze: (product.glaze ?? []) as GlazeEntry[],
        imageUrl: product.image_url ?? '',
        ...(galleryImages.length > 0 || product.video_url
          ? { galleryImages: [
              ...(product.video_url ? [product.video_url as string] : []),
              ...galleryImages,
            ] }
          : {}),
        text: product.description ?? '',
        video_url: product.video_url ?? null,
        price_hw: product.price_hw ?? 0,
        stock_level: product.stock_level ?? 0,
        stripe_price_id: product.stripe_price_id ?? null,
        ...(product.mug_shape_slug ? { mug_shape_slug: product.mug_shape_slug as string } : {}),
        ...(product.shape_label ? { shape_label: product.shape_label as string } : {}),
        etsy_listing_id: product.etsy_listing_id ?? null,
      };
    })
  );

  return projects;
}

/**
 * List images in the `product-images/{productId}/` folder from
 * Supabase Storage and return their public URLs.
 */
async function fetchProductGalleryImages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  productId: string
): Promise<string[]> {
  const bucket = 'product-images';
  const folder = `${productId}/`;

  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(folder, { sortBy: { column: 'name', order: 'asc' } });

  if (error || !files) return [];

  return files
    .filter((f: { name: string }) => !f.name.startsWith('.'))
    .map((f: { name: string }) => {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${folder}${f.name}`);
      return data.publicUrl;
    });
}
