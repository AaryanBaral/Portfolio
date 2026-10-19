import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { EXPERIENCE, type Experience as Role } from "@/content/profile";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

// Draft entries are previewed in development so the layout is visible; production only shows real ones.
const PREVIEW_DRAFTS = process.env.NODE_ENV !== "production";

/**
 * `latest`: home page, the most recent role plus a link to the rest.
 * `all`: /about, the full timeline.
 */
export function Experience({ variant }: { variant: "latest" | "all" }) {
  const roles = EXPERIENCE.filter((e) => !e.draft || PREVIEW_DRAFTS);
  if (roles.length === 0) return null;
  const shown = variant === "latest" ? roles.slice(0, 1) : roles;

  return (
    <section id="experience" aria-labelledby="experience-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader
        eyebrow={variant === "latest" ? "Latest experience" : "Experience"}
        id="experience-title"
        title={variant === "latest" ? "Where I'm building right now." : "Where I've built things."}
      />
      <ol className="mt-12 flex flex-col gap-4">
        {shown.map((role, i) => (
          <Reveal as="li" key={`${role.company}-${role.start}`} delay={i * 80}>
            <RoleCard role={role} />
          </Reveal>
        ))}
      </ol>
      {variant === "latest" && (
        <Link href="/about" className="group mt-6 inline-flex items-center gap-2 text-sm text-accent transition hover:text-hover">
          Full background
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </section>
  );
}

function RoleCard({ role }: { role: Role }) {
  return (
    <SpotlightCard className="p-6 md:p-8" data-testid="experience-role">
      {role.draft && (
        <p className="mb-4 inline-block rounded-full border border-dashed border-[#fab219]/60 px-3 py-1 font-mono text-[11px] text-[#fab219]">
          Draft preview: fill in content/profile.ts and set draft: false (hidden in production)
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <p className="font-mono text-xs text-muted">
            {role.start} — {role.end ?? "Present"}
          </p>
          {role.end === null && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden /> Current
            </p>
          )}
          {role.location && <p className="mt-2 text-xs text-muted">{role.location}</p>}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
            {role.role} <span className="text-muted">·</span>{" "}
            {role.url ? (
              <a href={role.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:text-hover">
                {role.company} <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            ) : (
              <span className="text-accent">{role.company}</span>
            )}
          </h3>
          <p className="mt-3 text-pretty text-muted">{role.summary}</p>
          <ul className="mt-5 flex flex-col gap-3">
            {role.highlights.map((h, i) => (
              <li key={i} className="flex gap-3 text-sm md:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span className="text-pretty">{h}</span>
              </li>
            ))}
          </ul>
          {role.stack.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
              {role.stack.map((s) => (
                <li key={s} className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}
