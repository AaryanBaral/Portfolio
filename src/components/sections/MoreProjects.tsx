import { ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/content/profile";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

export function MoreProjects() {
  if (PROJECTS.length === 0) return null;
  return (
    <section id="more-projects" aria-labelledby="more-projects-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader eyebrow="More projects" id="more-projects-title" title="Other things I've built." />
      <ul className="mt-12 grid gap-4 md:grid-cols-2">
        {PROJECTS.map((project, i) => (
          <Reveal as="li" key={project.name} delay={(i % 2) * 80}>
            <SpotlightCard className="flex h-full flex-col p-6" data-testid="project-card">
              <h3 className="text-lg font-semibold">{project.name}</h3>
              <p className="mt-2 flex-1 text-sm text-pretty text-muted">{project.description}</p>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Technologies">
                {project.stack.map((s) => (
                  <li key={s} className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
                    {s}
                  </li>
                ))}
              </ul>
              {project.links.length > 0 && (
                <div className="mt-5 flex gap-4">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-accent transition hover:text-hover"
                    >
                      {link.label} <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </a>
                  ))}
                </div>
              )}
            </SpotlightCard>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
