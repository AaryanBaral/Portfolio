import type { Metadata } from "next";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { MoreProjects } from "@/components/sections/MoreProjects";
import { SectionDivider } from "@/components/ui/SectionHeader";

export const metadata: Metadata = { title: "Projects", description: "Case studies: problems, decisions, trade-offs and results." };

export default function ProjectsPage() {
  return (
    <main className="page-container flex-1 pt-8">
      <CaseStudies />
      <SectionDivider />
      <MoreProjects />
    </main>
  );
}
