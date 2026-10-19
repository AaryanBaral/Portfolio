"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fades and lifts its content in the first time it scrolls into view. Pure CSS transition toggled by one
 * IntersectionObserver; content is visible without JS (see `.js` guard in globals.css) and with reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Both tags take the same props here; one concrete type keeps JSX inference simple.
  const Tag = as as "div";
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.visible = "true";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref} data-reveal className={className} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}
