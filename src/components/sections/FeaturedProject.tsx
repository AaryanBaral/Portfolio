import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CASE_STUDIES } from "@/content/profile";
import { StaticArchitecture } from "../hero/StaticArchitecture";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

/** Home page: the one project worth a recruiter's next 30 seconds. */
export function FeaturedProject() {
  const study = CASE_STUDIES.find((c) => c.featured && !c.draft) ?? CASE_STUDIES.find((c) => !c.draft);
  if (!study) return null;

  return (
    <section id="featured" aria-labelledby="featured-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader eyebrow="Highlighted project" id="featured-title" title={study.title}>
        {study.summary}
      </SectionHeader>

      <Reveal className="mt-12">
        <SpotlightCard className="glow-border overflow-hidden" data-testid="featured-project">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="flex min-w-0 flex-col gap-8 p-6 md:p-8">
              <p className="font-mono text-xs text-muted">{study.kind}</p>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
                {study.results.map((r) => (
                  <div key={r.label} className="flex flex-col bg-surface p-4">
                    <dt className="order-2 mt-1 text-xs text-muted">{r.label}</dt>
                    <dd className="order-1 font-mono text-2xl font-semibold text-accent">{r.value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="flex flex-wrap gap-2" aria-label="Technologies">
                {study.stack.slice(0, 8).map((s) => (
                  <li key={s} className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3">
                <Link
                  href={`/projects#${study.id}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:bg-hover"
                >
                  Read the case study
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
                {study.liveHref && (
                  <Link
                    href={study.liveHref}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm transition hover:border-hover hover:text-hover"
                  >
                    Break it in the sandbox <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            </div>
            <div className="relative flex min-w-0 items-center border-t border-border bg-background/40 p-6 lg:border-t-0 lg:border-l">
              <StaticArchitecture className="w-full" />
            </div>
          </div>
        </SpotlightCard>
      </Reveal>
    </section>
  );
}
