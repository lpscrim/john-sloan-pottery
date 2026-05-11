import { Suspense } from "react";
import type { Metadata } from "next";
import { getProjects } from "../_data/projects";
import WorkGallery from "../_components/Sections/Work/WorkGallery";
import { getCategoriesVisible } from "../_lib/shippingSettings";

export const metadata: Metadata = {
  title: "Work",
  // TODO: Replace with a description of your gallery / shop
  description:
    "Browse original artworks available to purchase from the gallery.",
};



export default async function WorkPage() {
  const [projects, showCategories] = await Promise.all([
    getProjects(),
    getCategoriesVisible(),
  ]);

  // Count categories
  const categoryCounts = projects.reduce((acc, project) => {
    project.categories.forEach((category) => {
      acc[category] = (acc[category] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Sort by count (descending)
  const sortedCategories = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <main>
      <Suspense fallback={null}>
        <WorkGallery 
          projects={projects} 
          categoryCounts={sortedCategories}
          showCategories={showCategories}
        />
      </Suspense>
    </main>
  );
}
