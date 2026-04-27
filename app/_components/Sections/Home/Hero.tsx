'use client';

import { useRef, useCallback } from 'react';

export function Hero() {
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  const handleEnded = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    video.pause();
    setTimeout(() => {
      video.currentTime = 0;
      video.play();
    }, 5000);
  }, []);

  return (
    <section id="home" className="min-h-svh flex flex-col justify-center items-center">
      {/* Top image strip - Desktop */}
      <div className='absolute bg-black/5 backdrop-blur-none w-full h-full z-9'></div>
      <div className="hidden md:flex w-full h-svh relative overflow-hidden justify-center items-center">
        {/* Static image positioned in background */}
        <video 
          ref={desktopVideoRef}
          src="/Banner Landscape.mp4" 
          autoPlay 
          muted
          playsInline
          onEnded={() => handleEnded(desktopVideoRef.current)}
          className="object-cover object-center h-auto min-h-full w-full"
        />
        <h2 
          className="absolute inset-0 flex items-center text-center font-medium justify-center text-[3vw]/[3vw] tracking-wide text-card z-20 flex-col opacity-[0.95]"
        >
          <span className='mb-4'>[ARTIST NAME] <div className="w-1/2 mx-auto border-b-2 border-card pb-4 " /></span>{/* TODO: Replace [ARTIST NAME] */}
          
          <span className='text-[1.5vw]/[1.5vw]'>ARTIST</span>{/* TODO: Replace tagline */}
        </h2>
      </div>
      {/* Mobile */}
      <div className="flex md:hidden w-full h-svh relative overflow-hidden justify-center items-center">
        <video 
          ref={mobileVideoRef}
          src="/Banner Portrait.mp4" 
          autoPlay 
          muted
          playsInline
          onEnded={() => handleEnded(mobileVideoRef.current)}
          className="object-cover object-center h-auto min-h-full w-full"
        />
        <h2 
          className="absolute inset-0 flex items-center text-center font-medium justify-center text-[6vw]/[6vw] tracking-widest text-card z-20 flex-col opacity-[0.95]"
        >
          <span className='mb-4'>[ARTIST NAME] <div className="w-1/2 mx-auto border-b-1 border-card pb-4 " /></span>{/* TODO: Replace [ARTIST NAME] */}
          
          <span className='text-[3vw]/[3vw]'>ARTIST</span>{/* TODO: Replace tagline */}
        </h2>
      </div>

    </section>
  );
}
