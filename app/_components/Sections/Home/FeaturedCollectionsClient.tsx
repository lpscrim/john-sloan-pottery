'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HomeFeaturedCollectionSlide } from '@/app/_lib/homeFeaturedCollections';
import Button from '../../UI/Layout/Button';

interface Props {
  slides: HomeFeaturedCollectionSlide[];
}

export default function FeaturedCollectionsClient({ slides }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleSlides = slides.slice(0, 3);

  useEffect(() => {
    if (visibleSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleSlides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [visibleSlides.length]);

  return (
    <section id="featured-collections" className="relative w-full h-[85svh] overflow-hidden">
      {visibleSlides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={`${slide.title}-${index}`}
            className={`absolute inset-0 transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <div className="absolute inset-0 bg-muted/20">
              {slide.imageUrl ? (
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/25" />
            </div>

            <div className="relative z-10 h-full w-full flex items-end px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
              <div className="max-w-2xl text-background space-y-5">
                <p className="text-sm sm:text-base tracking-[0.18em] uppercase text-background/80">
                  Featured collection
                </p>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl tracking-tight nav">
                  {slide.title}
                </h2>
                <p className="text-lg sm:text-xl max-w-xl text-background/90">
                  {slide.text}
                </p>
                <Button size="xl" light>
                  <Link href={`/work?category=${encodeURIComponent(slide.category)}`}>
                    {slide.buttonLabel}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-6 right-6 z-20 flex gap-2">
        {visibleSlides.map((slide, index) => (
          <button
            key={`${slide.title}-dot-${index}`}
            aria-label={`Show ${slide.title}`}
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-10 bg-background' : 'w-2.5 bg-background/45 hover:bg-background/70'}`}
          />
        ))}
      </div>
    </section>
  );
}