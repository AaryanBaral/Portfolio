import type { Metadata } from "next";
import { Education } from "@/components/sections/Education";
import { Experience } from "@/components/sections/Experience";
import { QuickView } from "@/components/sections/QuickView";
import { SectionDivider } from "@/components/ui/SectionHeader";

export const metadata: Metadata = { title: "About", description: "Who I am, what I build, and where I've built it." };

export default function AboutPage() {
  return (
    <main className="page-container flex-1 pt-8">
      <QuickView />
      <SectionDivider />
      <Experience variant="all" />
      <SectionDivider />
      <Education />
    </main>
  );
}
