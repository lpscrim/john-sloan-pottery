import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return 'https://example.com'; // TODO: Replace with your domain or set NEXT_PUBLIC_SITE_URL env var
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = new URL(getSiteUrl()).origin;
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Pull latest product update date from Supabase if available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('products')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data?.updated_at) {
        // Update /shop entry with actual last modified date
        entries[1].lastModified = new Date(data.updated_at);
      }
    } catch {
      // Silently fall back to current date
    }
  }

  return entries;
}
