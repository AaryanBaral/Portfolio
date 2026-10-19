import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function SectionHeader({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  /** id of the heading, for aria-labelledby on the section. */
  id: string;
  children?: ReactNode;
}) {
  return (
    <Reveal className="max-w-3xl">
      <p className="flex items-center gap-3 font-mono text-xs tracking-[0.25em] text-accent uppercase">
        <span className="h-px w-8 bg-accent/60" aria-hidden />
        {eyebrow}
      </p>
      <h2 id={id} className="text-gradient mt-4 text-3xl font-semibold tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
      {children && <div className="mt-5 max-w-2xl text-base text-pretty text-muted md:text-lg">{children}</div>}
    </Reveal>
  );
}

/** Thin gradient rule between sections: quieter than a full-width border. */
export function SectionDivider() {
  return <div aria-hidden className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-border to-transparent" />;
}
