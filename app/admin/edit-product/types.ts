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
  glaze: string[];
  image_url: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  gallery: AdminGalleryImage[];
}
