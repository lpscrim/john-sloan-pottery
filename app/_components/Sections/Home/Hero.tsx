'use client';

import { useRef, useCallback } from 'react';
import Image from 'next/image';

export function Hero() {
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  const handleEnded = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
      video.currentTime = 0;
      video.play();
  }, []);

  return (
    <section id="home" className="min-h-lvh flex flex-col justify-center items-center">
      {/* Top image strip - Desktop */}
      <div className='absolute bg-black/10 backdrop-blur-md w-full h-full z-9'></div>
      <div className="hidden md:flex w-full h-svh relative overflow-hidden justify-center items-center">
        {/* Static image positioned in background */}
        <video 
          ref={desktopVideoRef}
          src="/pottery.mp4" 
          autoPlay 
          muted
          playsInline
          onEnded={() => handleEnded(desktopVideoRef.current)}
          className="object-cover object-center h-auto min-h-full w-full"
        />
        <div 
          className="absolute inset-0 flex title -mt-12 items-center text-center font-medium justify-center tracking-wide z-20 flex-col "
        >
          <div className="relative w-[350px] h-[350px]">
            <Image src="/Logo.webp" alt="Logo" fill sizes="350px" className="object-contain opacity-0 fade-in" loading='eager' />
          </div>


        </div>
      </div>
      {/* Mobile */}
      <div className="flex md:hidden w-full h-svh relative overflow-hidden justify-center items-center">
        <video 
          ref={mobileVideoRef}
          src="/pottery.mp4" 
          autoPlay 
          muted
          playsInline
          onEnded={() => handleEnded(mobileVideoRef.current)}
          className="object-cover object-center h-auto min-h-full w-full"
        />
        <div 
          className="absolute inset-0 flex title -mt-12 items-center text-center font-medium justify-center tracking-wide z-20 flex-col "
        >
          <div className="relative w-[200px] h-[200px]">
            <Image src="/Logo.webp" alt="Logo" fill sizes="200px" className="object-contain opacity-0 fade-in" loading='eager' />
          </div>

        </div>
      </div>

    </section>
  );
}
