import { Suspense } from "react";
import { About } from "./_components/Sections/Home/About";
import { Contact } from "./_components/Sections/Home/Contact";
import { FeaturedCollections } from "./_components/Sections/Home/Featured/FeaturedCollections";
import { Hero } from "./_components/Sections/Home/Hero";
import { Projects } from "./_components/Sections/Home/Projects/Projects";
import { ProjectsSkeleton } from "./_components/Sections/Home/Projects/ProjectsSkeleton";
import { Create } from "./_components/Sections/Home/Create";

function OrganizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "John Sloan Pottery",
    url: siteUrl,
    description:
      "John Sloan Pottery — handmade stoneware mugs, bowls, and vessels thrown and fired on the Isle of Skye. Each piece is unique, finished in a range of distinctive glazes.",
    sameAs: [], // TODO: Add your social media URLs
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function Home() {
  return (
    <main className="min-h-svh">
      <OrganizationJsonLd />
      <Hero />
      <Suspense fallback={<ProjectsSkeleton />}>
        <Projects />
      </Suspense>
      <Suspense>
        <FeaturedCollections />
      </Suspense>
      <Suspense>
        <About />
      </Suspense>
      <Create />
      <Contact />
    </main>
  );
}
