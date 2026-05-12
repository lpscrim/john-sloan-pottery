import { getProjects } from "@/app/_data/projects";
import { ProjectsCarousel } from "./ProjectsCarousel";

export async function Projects() {
  const projects = await getProjects();
  return <ProjectsCarousel projects={projects} />;
}
