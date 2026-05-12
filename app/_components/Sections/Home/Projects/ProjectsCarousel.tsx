'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ImageWithFallback } from '@/app/_components/UI/Layout/ImageWithFallback';
import type { Project } from '@/app/_data/projects';

interface Props {
  projects: Project[];
}

export function ProjectsCarousel({ projects }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(projects.length > 1);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  function update() {
    const t = trackRef.current;
    if (!t) return;
    setCanPrev(t.scrollLeft > 4);
    setCanNext(t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
  }

  useEffect(() => {
    update();
    const t = trackRef.current;
    if (!t) return;
    t.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(t);
    return () => {
      t.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  function scrollBy(dir: 1 | -1) {
    const t = trackRef.current;
    if (!t) return;
    const card = t.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(t).gap) || 24;
    const step = card ? card.offsetWidth + gap : 300;
    t.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const t = trackRef.current;
    if (!t) return;
    dragRef.current = { active: true, startX: e.pageX - t.offsetLeft, scrollLeft: t.scrollLeft, moved: false };
    t.style.scrollSnapType = 'none'; // disable snap during drag
    t.style.cursor = 'grabbing';
    t.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const t = trackRef.current;
    const d = dragRef.current;
    if (!d.active || !t) return;
    const dx = e.pageX - t.offsetLeft - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    t.scrollLeft = d.scrollLeft - dx;
  }, []);

  const onMouseUp = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    dragRef.current.active = false;
    t.style.cursor = '';
    t.style.userSelect = '';

    // Snap smoothly to the nearest card then re-enable CSS snap
    const cards = Array.from(t.children) as HTMLElement[];
    let nearest = cards[0];
    let minDist = Infinity;
    for (const card of cards) {
      const dist = Math.abs(card.offsetLeft - t.scrollLeft);
      if (dist < minDist) { minDist = dist; nearest = card; }
    }
    t.scrollTo({ left: nearest.offsetLeft, behavior: 'smooth' });
    // Re-enable snap after the smooth scroll settles
    t.addEventListener('scrollend', () => { t.style.scrollSnapType = ''; }, { once: true });
  }, []);

  return (
    <section id="work" className="py-8 lg:py-12 xl:py-16">
      <div className="relative px-12 lg:px-16">

        {/* Card track — native scroll for touch, mouse-drag for desktop */}
        <div
          ref={trackRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory cursor-grab"
          style={{ scrollbarWidth: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/work?project=${project.id}`}
              onClick={(e) => { if (dragRef.current.moved) e.preventDefault(); }}
              className="group cursor-crosshair snap-start shrink-0 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.33%-1rem)]"
            >
              <div className="relative aspect-4/5 bg-muted overflow-hidden rounded-sm">
                <ImageWithFallback
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover transition-all duration-500 scale-110 group-hover:scale-115"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
            </Link>
          ))}
        </div>

        {/* Prev button */}
        <button
          onClick={() => scrollBy(-1)}
          disabled={!canPrev}
          aria-label="Previous project"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-background border border-muted shadow-sm hover:bg-muted/50 transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
        </button>

        {/* Next button */}
        <button
          onClick={() => scrollBy(1)}
          disabled={!canNext}
          aria-label="Next project"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-background border border-muted shadow-sm hover:bg-muted/50 transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>

      </div>
    </section>
  );
}
