import type { GlazeEntry } from '@/app/_data/projects';

export interface AdminGalleryImage {
  path: string;
  url: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price_hw: number;
  stock_level: number;
  categories: string[];
  glaze: GlazeEntry[];
  image_url: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  gallery: AdminGalleryImage[];
  mug_shape_slug: string | null;
  shape_label: string | null;
  video_url: string | null;
}
