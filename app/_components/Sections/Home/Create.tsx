'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Button from "../../UI/Layout/Button";
import Link from "next/link";

export function Create() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-120, 120]);

  return (
    <section ref={sectionRef} id="create" className="">
      
      <div className="flex w-full h-[105svh] relative overflow-hidden justify-center items-center">
        <motion.div
          className="absolute inset-x-0 -top-[10%] -bottom-[10%]"
          style={{ y }}
        >
          <video
            src="/Pottery2.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="object-cover object-center h-full w-full"
          />
        </motion.div>
        <div className="absolute bg-black/10 w-full h-full z-9" />

        <div className="absolute sm:right-16 w-full sm:w-2/3 flex -mt-28 sm:flex-end font-medium justify-center tracking-wide z-20 flex-col">
            <p className="text-base sm:text-lg md:text-xl text-background text-center sm:text-right tracking-wide ">Handmade on the Isle of Skye</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl text-background text-center sm:text-right tracking-tight mt-12">Each piece is unique</h2>
            <div className="relative self-center sm:self-end mt-12 sm:mt-16"> 
                <Button size="xl" light>
                  <Link href="/custom-mug">Build Your Own</Link>
                </Button>
            </div>
        </div>    
      </div>
    </section>
  );
}