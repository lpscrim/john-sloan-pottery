import { Suspense } from "react";
import { About } from "./_components/Sections/Home/About";
import { Contact } from "./_components/Sections/Home/Contact";
import { Hero } from "./_components/Sections/Home/Hero";
import { Projects } from "./_components/Sections/Home/Projects";
import { ProjectsSkeleton } from "./_components/Sections/Home/ProjectsSkeleton";

function OrganizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Art Shop", // TODO: Replace with your site name
    url: siteUrl,
    description:
      "An art portfolio and shop.", // TODO: Replace with your site description
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
    <main className="min-h-lvh">
      <OrganizationJsonLd />
      <Hero />
      <Suspense fallback={<ProjectsSkeleton />}>
        <Projects />
      </Suspense>
      <Suspense>
        <About />
      </Suspense>
      <Contact />
    </main>
  );
}
