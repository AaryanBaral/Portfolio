import { ArrowDownToLine, BriefcaseBusiness, Mail, MapPin } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { PROFILE } from "@/content/profile";
import { GithubIcon, LinkedinIcon } from "../ui/BrandIcons";
import { LivePulse } from "./LivePulse";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

export function QuickView() {
  const links = [
    PROFILE.resumeUrl && { label: "Download resume", href: PROFILE.resumeUrl, icon: ArrowDownToLine, primary: true, download: true },
    PROFILE.email && { label: "Email me", href: `mailto:${PROFILE.email}`, icon: Mail },
    PROFILE.links.github && { label: "GitHub", href: PROFILE.links.github, icon: GithubIcon },
    PROFILE.links.linkedin && { label: "LinkedIn", href: PROFILE.links.linkedin, icon: LinkedinIcon },
  ].filter(Boolean) as { label: string; href: string; icon: ComponentType<SVGProps<SVGSVGElement>>; primary?: boolean; download?: boolean }[];

  return (
    <section id="quick-view" aria-labelledby="quick-view-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader eyebrow="Quick view" id="quick-view-title" title="The 30-second version." />

      <div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <SpotlightCard className="h-full p-6 md:p-8">
            <p className="font-mono text-xs text-muted">{PROFILE.role}</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{PROFILE.name}</h3>
            <p className="mt-4 text-lg text-pretty text-muted">{PROFILE.tagline}</p>
            <ul className="mt-8 flex flex-col gap-4">
              {PROFILE.highlights.map((line, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-1 font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-pretty">{line}</span>
                </li>
              ))}
            </ul>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={120}>
          <SpotlightCard className="flex h-full flex-col gap-6 p-6 md:p-8">
            <div>
              <h3 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Core stack</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {PROFILE.coreStack.map((tech) => (
                  <li key={tech} className="rounded-full border border-border bg-background/50 px-3 py-1 text-sm">
                    {tech}
                  </li>
                ))}
              </ul>
            </div>

            {(PROFILE.location || PROFILE.availability) && (
              <ul className="flex flex-col gap-2 text-sm text-muted">
                {PROFILE.availability && (
                  <li className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4 text-accent" aria-hidden /> {PROFILE.availability}
                  </li>
                )}
                {PROFILE.location && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" aria-hidden /> {PROFILE.location}
                  </li>
                )}
              </ul>
            )}

            <LivePulse />

            <div className="mt-auto">
              <h3 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Proof, not claims</h3>
              <p className="mt-2 text-sm text-muted">
                Everything on this site runs on the stack above. Skip to the{" "}
                <a href="/live" className="text-accent underline-offset-4 hover:text-hover hover:underline">
                  live system
                </a>{" "}
                to watch it work, or the{" "}
                <a href="/live#sandbox" className="text-accent underline-offset-4 hover:text-hover hover:underline">
                  sandbox
                </a>{" "}
                to break it.
              </p>
            </div>

            {links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {links.map(({ label, href, icon: Icon, primary, download }) => (
                  <a
                    key={label}
                    href={href}
                    download={download || undefined}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noreferrer" : undefined}
                    className={
                      primary
                        ? "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition hover:bg-hover"
                        : "inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition hover:border-hover hover:text-hover"
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </a>
                ))}
              </div>
            )}
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  );
}
