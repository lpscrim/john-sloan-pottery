'use client';

import { useRef } from 'react';

interface Props {
  duration: number;
  children: React.ReactNode;
}

export function MarqueeBanner({ duration, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  function animateRate(to: number) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const el = ref.current;
    if (!el) return;
    const anim = el.getAnimations()[0];
    if (!anim) return;
    const from = anim.playbackRate;
    const start = performance.now();
    const dur = 700;

    function step(now: number) {
      const t = Math.min((now - start) / dur, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      anim.playbackRate = from + (to - from) * eased;
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  return (
    <div
      className="overflow-hidden w-full"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
    >
      <div
        ref={ref}
        className="flex gap-6 w-max animate-marquee"
        style={{ animationDuration: `${duration}s` }}
        onMouseEnter={() => animateRate(0.05)}
        onMouseLeave={() => animateRate(1)}
      >
        {children}
      </div>
    </div>
  );
}
