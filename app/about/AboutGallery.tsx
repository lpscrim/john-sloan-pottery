'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function AboutGallery({ images }: { images: string[] }) {
  const [orientations, setOrientations] = useState<(boolean | null)[]>(
    () => images.map(() => null)
  );
  const [lightbox, setLightbox] = useState<string | null>(null);

  function handleLoad(i: number, e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setOrientations((prev) => {
      const next = [...prev];
      next[i] = img.naturalWidth > img.naturalHeight;
      return next;
    });
  }

  if (!images.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[28vw] md:auto-rows-[19vw] lg:auto-rows-[14.5vw] xl:auto-rows-[193px]">
        {images.map((url, i) => {
          const isLandscape = orientations[i] === true;
          return (
            <button
              key={url}
              className="relative overflow-hidden rounded-sm cursor-crosshair group"
              style={{ gridRow: `span ${isLandscape ? 1 : 2}` }}
              onClick={() => setLightbox(url)}
              aria-label={`View image ${i + 1} larger`}
            >
              <Image
                src={url}
                alt={`Exhibition image ${i + 1}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                onLoad={(e) => handleLoad(i, e)}
              />
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex pt-16 items-center justify-center p-4 bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl max-h-[80svh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox}
              alt=""
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-4 right-5 text-white/70 hover:text-white text-3xl leading-none cursor-crosshair"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
