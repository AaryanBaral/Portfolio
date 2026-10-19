import { ArrowUpRight } from "lucide-react";
import { STACK } from "@/content/profile";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

export function Stack() {
  return (
    <section id="stack" aria-labelledby="stack-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader eyebrow="Stack" id="stack-title" title="Skills, grouped by where a request meets them.">
        No logo wall. Each item links to the part of this site where it is running right now.
      </SectionHeader>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STACK.map((group, i) => (
          <Reveal key={group.layer} delay={(i % 3) * 90}>
            <SpotlightCard className="h-full p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold">{group.layer}</h3>
                <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{group.blurb}</p>
              <ul className="mt-5 flex flex-col">
                {group.items.map((item) => (
                  <li key={item.name} className="border-t border-border first:border-t-0">
                    <a href={item.href} className="group flex items-start justify-between gap-3 py-3">
                      <span>
                        <span className="block text-sm font-medium transition group-hover:text-hover">{item.name}</span>
                        <span className="block text-xs text-pretty text-muted">{item.usedFor}</span>
                      </span>
                      <ArrowUpRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-hover"
                        aria-hidden
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
