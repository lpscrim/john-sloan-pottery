import Image from 'next/image';
import { getAboutContent } from '@/app/_lib/aboutContent';
import AboutGallery from './AboutGallery';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'About the artist — biography and work.', // TODO: Replace with artist-specific description
};

export default async function AboutPage() {
  const about = await getAboutContent();

  return (
    <main className="min-h-screen bg-background text-foreground">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="px-6 pt-26 pb-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">

          {/* Portrait */}
          {about.portrait_url ? (
            <div className="relative aspect-3/4 w-full overflow-hidden rounded-sm">
              <Image
                src={about.portrait_url}
                alt="Artist portrait" 
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
          ) : (
            <div className="aspect-3/4 w-full bg-muted rounded-sm" />
          )}

          {/* Statement */}
          <div className="flex flex-col justify-center gap-8 ">
            <h1 className="text-4xl md:text-5xl tracking-tight">In The Studio</h1>
            {about.statement && (
              <p className="text-xl xl:text-2xl italic leading-relaxed" style={{ fontFamily: 'EB Garamond, serif' }}>
                {about.statement}
              </p>
            )}
            {about.bio && about.bio.split(/\r?\n\r?\n+/).filter(Boolean).map((para, i) => (
              <p key={i} className="text-base xl:text-lg text-muted-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────────────────────── */}
      {about.gallery_images.length > 0 && (
        <section className="px-6 py-16 bg-muted/20">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-widest text-muted-foreground uppercase mb-8">Studio &amp; Exhibition</p>
            <AboutGallery images={about.gallery_images} />
          </div>
        </section>
      )}

      {/* ── Secondary (reversed) ─────────────────────────────── */}
      {(about.secondary_image_url || about.secondary_text) && (
        <section className="px-6 py-20 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">

            {/* Text — left column */}
            <div className="flex flex-col justify-center gap-8">
              {about.secondary_text && about.secondary_text.split(/\r?\n\r?\n+/).filter(Boolean).map((para, i) => (
                <p key={i} className="text-base xl:text-lg text-muted-foreground leading-relaxed">
                  {para}
                </p>
              ))}
            </div>

            {/* Image — right column */}
            {about.secondary_image_url ? (
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-sm">
                <Image
                  src={about.secondary_image_url}
                  alt="Artist"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </div>
            ) : (
              <div className="aspect-3/4 w-full bg-muted rounded-sm" />
            )}
          </div>
        </section>
      )}

    </main>
  );
}
