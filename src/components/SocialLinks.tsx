import { Mail } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { PROFILE } from "@/content/profile";
import { GithubIcon, LinkedinIcon, XIcon } from "./ui/BrandIcons";

type Social = { id: string; label: string; href: string | null; icon: ComponentType<SVGProps<SVGSVGElement>>; brand: string };

/** Brand colours shown on hover (GitHub and X use their dark-mode marks so they read on a dark page). */
const SOCIALS: Social[] = [
  { id: "github", label: "GitHub", href: PROFILE.links.github, icon: GithubIcon, brand: "#f0f6fc" },
  { id: "linkedin", label: "LinkedIn", href: PROFILE.links.linkedin, icon: LinkedinIcon, brand: "#0a66c2" },
  { id: "x", label: "X", href: PROFILE.links.x, icon: XIcon, brand: "#ffffff" },
  { id: "email", label: "Email", href: PROFILE.email ? `mailto:${PROFILE.email}` : null, icon: Mail, brand: "#ea4335" },
];

// Unset links are previewed (dimmed, not clickable) in development so the layout is visible; production hides them.
const PREVIEW_UNSET = process.env.NODE_ENV !== "production";

/**
 * Social icons, monochrome until hovered or focused, then in their own brand colour. No magnification.
 * `dock` is the floating bar at the bottom centre (md+); `inline` is a plain row for the footer.
 */
export function SocialLinks({ variant }: { variant: "dock" | "inline" }) {
  const items = SOCIALS.filter((s) => s.href || PREVIEW_UNSET);
  if (items.length === 0) return null;

  const list = (
    <ul className={variant === "dock" ? "flex items-center gap-1.5" : "flex flex-wrap items-center gap-2"}>
      {items.map(({ id, label, href, icon: Icon, brand }) => {
        const base =
          "group relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-muted outline-none transition-[color,border-color,background-color] duration-200";
        const style = { "--brand": brand } as React.CSSProperties;
        const tooltip = (
          <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-1 rounded-md border border-white/10 bg-surface/90 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-foreground opacity-0 shadow-lg backdrop-blur transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            {href ? label : `${label}: set in content/profile.ts`}
          </span>
        );
        return (
          <li key={id}>
            {href ? (
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer me" : undefined}
                aria-label={label}
                data-testid={`social-${id}`}
                style={style}
                className={`${base} hover:border-[color-mix(in_srgb,var(--brand)_45%,transparent)] hover:text-[var(--brand)] focus-visible:text-[var(--brand)] focus-visible:ring-2 focus-visible:ring-hover/70`}
              >
                <Icon aria-hidden className="h-[18px] w-[18px]" />
                {tooltip}
              </a>
            ) : (
              <span
                role="img"
                aria-label={`${label} (link not set)`}
                data-testid={`social-${id}`}
                style={style}
                className={`${base} cursor-help opacity-40 hover:text-[var(--brand)] hover:opacity-70`}
              >
                <Icon aria-hidden className="h-[18px] w-[18px]" />
                {tooltip}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (variant === "inline") return <nav aria-label="Social links">{list}</nav>;

  return (
    <nav
      aria-label="Social links"
      data-chrome="social"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] left-1/2 z-50 hidden -translate-x-1/2 md:block"
    >
      <div className="rounded-2xl border border-white/10 bg-surface/60 p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl backdrop-saturate-150">
        {list}
      </div>
    </nav>
  );
}
