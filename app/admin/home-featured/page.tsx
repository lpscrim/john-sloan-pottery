import { getProjects } from '@/app/_data/projects';
import { getHomeFeaturedCollectionsContent } from '@/app/_lib/homeFeaturedCollections';
import HomeFeaturedClient from './HomeFeaturedClient';

export default async function HomeFeaturedPage() {
  const [content, projects] = await Promise.all([
    getHomeFeaturedCollectionsContent(),
    getProjects(),
  ]);
  const categoryOptions = Array.from(
    new Set(projects.flatMap((project) => project.categories).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));

  return (
    <div className="bg-background text-foreground px-6 pt-32 pb-16">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-3xl tracking-tight">HOME FEATURED COLLECTIONS</h1>
        <p className="text-base text-muted-foreground -mt-4">
          Edit the three full-width collection slides shown on the{' '}
          <a href="/#featured-collections" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            home page
          </a>
          .
        </p>
        <HomeFeaturedClient initial={content} categoryOptions={categoryOptions} />
      </div>
    </div>
  );
}