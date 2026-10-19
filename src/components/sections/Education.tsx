import { GraduationCap } from "lucide-react";
import { PROFILE } from "@/content/profile";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

export function Education() {
  const { education } = PROFILE;
  return (
    <section id="education" aria-labelledby="education-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader eyebrow="Education" id="education-title" title="Where it started." />
      <Reveal className="mt-12">
        <SpotlightCard className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:gap-8 md:p-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background/60 text-accent">
            <GraduationCap className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="font-mono text-xs text-muted">{education.years}</p>
            <h3 className="mt-1 text-xl font-semibold">{education.degree}</h3>
            <p className="mt-1 text-accent">{education.school}</p>
            <p className="mt-3 max-w-2xl text-sm text-pretty text-muted">{education.notes}</p>
          </div>
        </SpotlightCard>
      </Reveal>
    </section>
  );
}
