"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { CASE_STUDIES, type CaseStudy } from "@/content/profile";
import { StaticArchitecture } from "../hero/StaticArchitecture";
import { CodeBlock } from "../ui/CodeBlock";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

export function CaseStudies() {
  const published = CASE_STUDIES.filter((c) => !c.draft);
  return (
    <section id="case-studies" aria-labelledby="case-studies-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader eyebrow="Case studies" id="case-studies-title" title="How I solve problems.">
        The problem, the decisions, what I traded away, and the numbers that came out. Code included.
      </SectionHeader>
      <div className="mt-12 flex flex-col gap-6">
        {published.map((study, i) => (
          <Reveal key={study.id} delay={i * 80}>
            <CaseStudyCard study={study} defaultOpen={i === 0} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CaseStudyCard({ study, defaultOpen }: { study: CaseStudy; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `${study.id}-body`;
  return (
    <SpotlightCard id={study.id} className="scroll-mt-8 overflow-hidden" data-testid={`case-${study.id}`}>
      <div className="p-6 md:p-8">
        <p className="font-mono text-xs text-muted">{study.kind}</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <h3 className="max-w-2xl text-2xl font-semibold tracking-tight text-balance md:text-3xl">{study.title}</h3>
          {study.liveHref && (
            <a
              href={study.liveHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-sm text-accent transition hover:bg-hover hover:text-on-accent"
            >
              See it live <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
        <p className="mt-4 max-w-3xl text-pretty text-muted">{study.summary}</p>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
          {study.results.map((r) => (
            <div key={r.label} className="flex flex-col bg-surface p-4">
              <dt className="order-2 mt-1 text-xs text-muted">{r.label}</dt>
              <dd className="order-1 font-mono text-2xl font-semibold text-accent">{r.value}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="mt-6 inline-flex items-center gap-2 text-sm text-accent transition hover:text-hover"
        >
          {open ? "Hide the details" : "Read the case study"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>

      <div
        id={bodyId}
        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div
          className="overflow-hidden"
          inert={!open}
          style={{ visibility: open ? "visible" : "hidden", transition: open ? "visibility 0s" : "visibility 0s linear 0.5s" }}
        >
          <div className="grid gap-10 border-t border-border p-6 md:p-8 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-8">
              <Block title="The problem">
                <p className="text-pretty">{study.problem}</p>
              </Block>
              <Block title="What I built">
                <ol className="flex flex-col gap-3">
                  {study.approach.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-pretty">{step}</span>
                    </li>
                  ))}
                </ol>
              </Block>
            </div>
            <div className="flex min-w-0 flex-col gap-8">
              {study.id === "portfolio-platform" && (
                <Block title="Architecture">
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <StaticArchitecture className="w-full" />
                  </div>
                </Block>
              )}
              <Block title="Trade-offs">
                <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                  {study.tradeoffs.map((t) => (
                    <li key={t.decision} className="p-4">
                      <p className="font-medium">{t.decision}</p>
                      <p className="mt-1 text-sm text-pretty text-muted">{t.because}</p>
                    </li>
                  ))}
                </ul>
              </Block>
              {study.code && (
                <Block title="Code worth reading">
                  <CodeBlock code={study.code.snippet} label={study.code.file} />
                </Block>
              )}
              <ul className="flex flex-wrap gap-2" aria-label="Technologies">
                {study.stack.map((s) => (
                  <li key={s} className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{title}</h4>
      <div className="text-sm leading-relaxed md:text-base">{children}</div>
    </div>
  );
}
