import { ImageWithFallback } from "@/app/_components/UI/Layout/ImageWithFallback";
import { getProjects } from "@/app/_data/projects";
import Button from "@/app/_components/UI/Layout/Button";
import Link from "next/link";
import { MarqueeBanner } from "./MarqueeBanner";

export async function Projects() {
  const projects = await getProjects();
  const items = [...projects, ...projects];

  return (
    <section id="work" className="py-24 xl:py-32 overflow-hidden">
      <div className="px-6 mb-16 xl:mb-24">
        <h2 className="text-3xl md:text-5xl tracking-tight"></h2>
      </div>

      <MarqueeBanner duration={projects.length * 4}>
        {items.map((project, idx) => (
          <Link
            key={idx}
            href={`/work?project=${project.id}`}
            className="group cursor-crosshair shrink-0 w-86 md:w-96 lg:w-104 xl:w-120"
          >
            <div className="relative aspect-4/5 bg-muted overflow-hidden rounded-xs">
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

      <div className="px-6 mt-24 text-center">
        <Button size="xl">
          <Link href="/work">See More</Link>
        </Button>
      </div>
    </section>
  );
}
