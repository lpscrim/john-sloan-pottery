import { ImageWithFallback } from "@/app/_components/UI/Layout/ImageWithFallback";
import { getProjects } from "@/app/_data/projects";
import Button from "@/app/_components/UI/Layout/Button";
import Link from "next/link";

export async function Projects() {
  const projects = await getProjects();
  // Duplicate for seamless loop
  const items = [...projects, ...projects];

  return (
    <section id="work" className="py-24 xl:py-32 overflow-hidden">
      <div className="px-6 mb-16 xl:mb-24">
        <h2 className="text-3xl md:text-5xl tracking-tight">Recent work</h2>
      </div>

      {/* Scrolling banner */}
      <div
        className="flex gap-6 w-max animate-marquee marquee-pausable"
        style={{ animationDuration: `${projects.length * 4}s` }}
      >
        {items.map((project, idx) => (
          <Link
            key={idx}
            href={`/work?project=${project.id}`}
            className="group cursor-crosshair shrink-0 w-72 md:w-96"
          >
            <div className="relative aspect-4/5 bg-muted overflow-hidden rounded-xs">
              <ImageWithFallback
                src={project.imageUrl}
                alt={project.title}
                className="w-full h-full object-cover transition-all duration-500 scale-110 group-hover:scale-115"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
            <h3 className="mt-3 tracking-tight text-sm truncate">{project.title}</h3>
          </Link>
        ))}
      </div>

      <div className="px-6 mt-16 text-center">
        <Button size="xl">
          <Link href="/work">See More</Link>
        </Button>
      </div>
    </section>
  );
}
