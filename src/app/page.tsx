import { Hero } from "@/components/hero/Hero";
import { Experience } from "@/components/sections/Experience";
import { FeaturedProject } from "@/components/sections/FeaturedProject";
import { SectionDivider } from "@/components/ui/SectionHeader";

/** Home: the 3D request journey, the highlighted project, and the latest role. Everything else has its own page. */
export default function Home() {
  return (
    <main id="top" className="flex-1">
      <Hero />
      <div className="page-container">
        <FeaturedProject />
        <SectionDivider />
        <Experience variant="latest" />
      </div>
    </main>
  );
}
