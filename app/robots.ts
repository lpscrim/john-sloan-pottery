import type { MetadataRoute } from 'next';

function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return 'https://example.com'; // TODO: Replace with your domain or set NEXT_PUBLIC_SITE_URL env var
}


export default function robots(): MetadataRoute.Robots {
  const baseUrl = new URL(getSiteUrl()).origin;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/purchase/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
