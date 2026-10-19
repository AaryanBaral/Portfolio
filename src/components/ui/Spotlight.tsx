"use client";

import type { ComponentPropsWithoutRef } from "react";

/** Card whose border and background glow follow the cursor, in the theme's highlight colour. */
export function SpotlightCard({ className = "", children, ...rest }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...rest}
      onPointerMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - box.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - box.top}px`);
        rest.onPointerMove?.(e);
      }}
      className={`spotlight relative rounded-2xl border border-border bg-surface ${className}`}
    >
      {children}
    </div>
  );
}
