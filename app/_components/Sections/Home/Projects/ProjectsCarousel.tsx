'use client';

import { useRef, useState, useEffect } from 'react';
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

  function handleWindowMouseMove(e: MouseEvent) {
    const t = trackRef.current;
    const d = dragRef.current;
    if (!d.active || !t) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    t.scrollLeft = d.scrollLeft - dx;
  }

  function endDrag() {
    const t = trackRef.current;
    const d = dragRef.current;
    if (!d.active || !t) return;
    d.active = false;
    t.style.cursor = '';
    t.style.userSelect = '';
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', endDrag);

    if (!d.moved) {
      t.style.scrollSnapType = '';
      return;
    }

    // Snap smoothly to the nearest card
    const cards = Array.from(t.children) as HTMLElement[];
    let nearest = cards[0];
    let minDist = Infinity;
    for (const card of cards) {
      const dist = Math.abs(card.offsetLeft - t.scrollLeft);
      if (dist < minDist) { minDist = dist; nearest = card; }
    }
    t.scrollTo({ left: nearest.offsetLeft, behavior: 'smooth' });
    const restore = () => { t.style.scrollSnapType = ''; };
    t.addEventListener('scrollend', restore, { once: true });
    setTimeout(restore, 600);
  }

  function onMouseDown(e: React.MouseEvent) {
    const t = trackRef.current;
    if (!t) return;
    e.preventDefault(); // stop native browser image-drag
    dragRef.current = { active: true, startX: e.clientX, scrollLeft: t.scrollLeft, moved: false };
    t.style.scrollSnapType = 'none';
    t.style.cursor = 'grabbing';
    t.style.userSelect = 'none';
    // Attach to window so mousemove/mouseup are never lost to child elements
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', endDrag);
  }

  return (
    <section id="work" className="py-8 lg:py-12 xl:py-16">
      <div className="px-4">


        <div className="relative">
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory cursor-grab"
            style={{ scrollbarWidth: 'none' }}
            onMouseDown={onMouseDown}
          >
            {projects.map((project, idx) => (
              <Link
                key={project.id}
                href={`/work?project=${project.id}`}
                onClick={(e) => { if (dragRef.current.moved) e.preventDefault(); }}
                className="group snap-start shrink-0"
              >
                <div className="relative h-[50vh] sm:h-[65vh] aspect-4/5 bg-muted overflow-hidden rounded-xs">
                  <ImageWithFallback
                    src={project.imageUrl}
                    alt={project.title}
                    priority={idx === 0}
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
            className="text-foreground/25 hover:text-foreground visible absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-background/0  hover:shadow-sm transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none"
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
            className="text-foreground/50 hover:text-foreground visible absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-background/0  hover:shadow-sm transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
}
