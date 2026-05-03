"use server";

import { SwipeGallery } from "../../UI/Layout/SwipeGallery";
import Button from "../../UI/Layout/Button";
import Link from "next/link";
import { getHomeAboutContent } from "@/app/_lib/homeAboutContent";

export async function About() {
  const { text, images } = await getHomeAboutContent();

  return (
    <section id="about" className="min-h-svh px-6 py-20 xl:py-32 bg-muted/30 items-center flex">
      <div className="w-full mx-auto">
        <div className="mb-24">
          <h2 className="text-3xl md:text-5xl tracking-tight text-center">Behind the clay</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-16 max-w-7xl mx-auto">
          <div className="space-y-6 text-xl xl:text-2xl">
            {text.split(/\r?\n\r?\n+/).filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className="flex justify-end items-center">
            <SwipeGallery
              images={images}
              alt="Artist portrait"
              className="w-full lg:w-4/5 rounded-sm aspect-4/3 overflow-hidden"
            />
          </div>
        </div>
         <div className="mt-24 text-center">
          <Button size="xl">
            <Link href="/about">In the studio</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
