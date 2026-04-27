import Image from 'next/image';
import { getAboutContent } from '@/app/_lib/aboutContent';
import AboutGallery from './AboutGallery';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Artist biography, CV, and selected exhibitions.', // TODO: Replace with artist-specific description
};

export default async function AboutPage() {
  const about = await getAboutContent();

  const soloExhibitions = about.exhibitions.filter((e) => e.type === 'solo');
  const groupExhibitions = about.exhibitions.filter((e) => e.type === 'group');

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
            <h1 className="text-4xl md:text-5xl tracking-tight">Artist Name</h1> {/* TODO: Replace with artist name */}
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

      {/* ── CV ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">

        {/* Solo Exhibitions */}
        {soloExhibitions.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs tracking-widest text-muted-foreground uppercase mb-8">Solo Exhibitions</h2>
            <div className="space-y-3">
              {[...soloExhibitions].sort((a, b) => Number(b.year) - Number(a.year)).map((ex, i) => (
                <div key={i} className="grid grid-cols-[4rem_1fr] gap-4 text-base border-b border-muted pb-3">
                  <span className="text-muted-foreground tabular-nums">{ex.year}</span>
                  <span>
                    <span className="font-medium">{ex.title}</span>
                    {ex.location && <span className="text-muted-foreground">, {ex.location}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group Exhibitions */}
        {groupExhibitions.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs tracking-widest text-muted-foreground uppercase mb-8">Group Exhibitions</h2>
            <div className="space-y-3">
              {[...groupExhibitions].sort((a, b) => Number(b.year) - Number(a.year)).map((ex, i) => (
                <div key={i} className="grid grid-cols-[4rem_1fr] gap-4 text-base border-b border-muted pb-3">
                  <span className="text-muted-foreground tabular-nums">{ex.year}</span>
                  <span>
                    <span className="font-medium">{ex.title}</span>
                    {ex.location && <span className="text-muted-foreground">, {ex.location}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {about.education.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs tracking-widest text-muted-foreground uppercase mb-8">Education</h2>
            <div className="space-y-3">
              {[...about.education].sort((a, b) => Number(b.year) - Number(a.year)).map((ed, i) => (
                <div key={i} className="grid grid-cols-[4rem_1fr] gap-4 text-base border-b border-muted pb-3">
                  <span className="text-muted-foreground tabular-nums">{ed.year}</span>
                  <span>
                    <span className="font-medium">{ed.qualification}</span>
                    {ed.institution && <span className="text-muted-foreground">, {ed.institution}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Awards */}
        {about.awards.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs tracking-widest text-muted-foreground uppercase mb-8">Awards &amp; Recognition</h2>
            <div className="space-y-3">
              {[...about.awards].sort((a, b) => Number(b.year) - Number(a.year)).map((aw, i) => (
                <div key={i} className="grid grid-cols-[4rem_1fr] gap-4 text-base border-b border-muted pb-3">
                  <span className="text-muted-foreground tabular-nums">{aw.year}</span>
                  <span className="font-medium">{aw.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Press */}
        {about.press.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs tracking-widest text-muted-foreground uppercase mb-8">Press &amp; Publications</h2>
            <div className="space-y-3">
              {[...about.press].sort((a, b) => Number(b.year) - Number(a.year)).map((pr, i) => (
                <div key={i} className="grid grid-cols-[4rem_1fr] gap-4 text-base border-b border-muted pb-3">
                  <span className="text-muted-foreground tabular-nums">{pr.year}</span>
                  <span>
                    <span className="font-medium">{pr.title}</span>
                    {pr.publication && <span className="text-muted-foreground">, {pr.publication}</span>}
                    {pr.url && (
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                      >
                        View →
                      </a>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
