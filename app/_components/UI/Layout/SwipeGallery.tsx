"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { ImageWithFallback } from "./ImageWithFallback";

interface SwipeGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

export function SwipeGallery({ images, alt, className = "" }: SwipeGalleryProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 8000);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length, resetTimer]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, images.length - 1));
    resetTimer();
  }, [images.length, resetTimer]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
    resetTimer();
  }, [resetTimer]);

  const handlers = useSwipeable({
    onSwipedLeft: goNext,
    onSwipedRight: goPrev,
    trackMouse: true,
  });

  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <ImageWithFallback
          src={images[0]}
          alt={alt}
          fill={true}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div {...handlers} className={`relative select-none ${className}`}>
      {images.map((src, i) => (
        <ImageWithFallback
          key={src}
          src={src}
          alt={i === index ? `${alt} ${i + 1}` : ""}
          fill={true}
          sizes="(min-width: 768px) 50vw, 100vw"
          className={`object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {/* Click halves to navigate */}
      <button
        onClick={goPrev}
        aria-label="Previous image"
        className="absolute left-0 top-0 h-full w-1/2 cursor-pointer"
      />
      <button
        onClick={goNext}
        aria-label="Next image"
        className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
      />

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); resetTimer(); }}
            aria-label={`Go to image ${i + 1}`}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === index ? "bg-white/90 scale-110" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
