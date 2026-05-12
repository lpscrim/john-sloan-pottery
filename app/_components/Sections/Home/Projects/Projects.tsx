import { ImageWithFallback } from "@/app/_components/UI/Layout/ImageWithFallback";
import { getProjects } from "@/app/_data/projects";
import Link from "next/link";
import { MarqueeBanner } from "./MarqueeBanner";

export async function Projects() {
  const projects = await getProjects();
  const BASE_COUNT = Math.min(Math.max(projects.length, 1), 10);
  const baseItems = Array.from({ length: BASE_COUNT }, (_, i) => projects[i % projects.length]);
  const items = [...baseItems, ...baseItems];

  return (
    <section id="work" className="py-8 lg:py-12 xl:py-16 overflow-hidden">

      <MarqueeBanner duration={BASE_COUNT * 6}>
        {items.map((project, idx) => (
          <Link
            key={idx}
            href={`/work?project=${project.id}`}
            className="group cursor-crosshair shrink-0 w-64 lg:w-75 xl:w-85"
          >
            
            <div className="relative aspect-4/5 bg-muted overflow-hidden rounded-sm">
              <ImageWithFallback
                src={project.imageUrl}
                alt={project.title}
                className="w-full h-full object-cover transition-all duration-500 scale-110 group-hover:scale-115"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
          </Link>
        ))}
      </MarqueeBanner>

      {/*<div className="px-6 mt-24 text-center">
        <Button size="xl">
          <Link href="/work">See All</Link>
        </Button>
      </div>*/}
    </section>
  );
}
