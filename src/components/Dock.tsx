"use client";

import { Palette } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PAGES } from "./pages";
import { ThemeStudio } from "./ThemeStudio";

const BASE = 44;
const MAX = 72;
const RADIUS = 140;
const TOUCH_SIZE = 38;

// Magnification needs a mouse and room: narrow windows get the compact dock even with a cursor.
const FINE_POINTER = "(hover: hover) and (pointer: fine) and (min-width: 520px)";
// From md up the dock is a vertical bar on the left edge; below that, a compact bar along the bottom.
const VERTICAL = "(min-width: 768px)";
function useMedia(query: string, server: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => server,
  );
}

// Tooltip sits above the icon on the bottom bar and to its right on the vertical dock.
const TOOLTIP =
  "pointer-events-none absolute z-10 rounded-md border border-white/10 bg-surface/90 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-foreground opacity-0 shadow-lg backdrop-blur transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 " +
  "-top-9 left-1/2 -translate-x-1/2 md:top-1/2 md:left-full md:ml-3 md:-translate-y-1/2 md:translate-x-1 md:group-hover:translate-x-0 md:group-focus-visible:translate-x-0";
const ITEM =
  "group relative flex items-center justify-center rounded-xl border bg-gradient-to-b from-white/[0.09] to-white/[0.02] outline-none transition-colors hover:border-hover/40 hover:text-hover focus-visible:border-hover focus-visible:text-hover focus-visible:ring-2 focus-visible:ring-hover/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * macOS-style page dock: a vertical bar centred on the left edge (md+), icons magnifying with cursor proximity;
 * a compact horizontal bar along the bottom on small screens and touch.
 */
export function Dock() {
  const fine = useMedia(FINE_POINTER, true);
  const vertical = useMedia(VERTICAL, true);
  const pathname = usePathname();
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [studioOpen, setStudioOpen] = useState(false);
  const closeStudio = useCallback(() => setStudioOpen(false), []);
  const themeIndex = PAGES.length;
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  /** Cursor position along the dock's axis (x for the bottom bar, y for the vertical dock). */
  const pointer = useRef<number | null>(null);

  useEffect(() => {
    const els = itemRefs.current;
    if (!fine) {
      els.forEach((el) => el?.style.setProperty("--size", `${TOUCH_SIZE}px`));
      return;
    }
    const sizes = els.map(() => BASE);
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const at = pointer.current;
      els.forEach((el, i) => {
        if (!el) return;
        let target = BASE;
        if (at !== null) {
          const rect = el.getBoundingClientRect();
          const center = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
          const d = Math.abs(at - center);
          if (d < RADIUS) target = BASE + (MAX - BASE) * ((1 + Math.cos((Math.PI * d) / RADIUS)) / 2);
        }
        sizes[i] += (target - sizes[i]) * (1 - Math.exp(-dt * 16));
        if (Math.abs(target - sizes[i]) < 0.05) sizes[i] = target;
        el.style.setProperty("--size", `${sizes[i].toFixed(2)}px`);
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fine, vertical]);

  /** Keyboard focus magnifies like the cursor would. */
  const focusAt = (i: number) => {
    const el = itemRefs.current[i];
    if (!el || !fine) return;
    const rect = el.getBoundingClientRect();
    pointer.current = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
  };
  const release = () => {
    pointer.current = null;
  };

  return (
    <nav
      aria-label="Pages"
      data-chrome="dock"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] left-1/2 z-50 -translate-x-1/2 md:top-1/2 md:bottom-auto md:left-[calc(env(safe-area-inset-left,0px)+16px)] md:translate-x-0 md:-translate-y-1/2"
    >
      <ul
        className="flex max-w-[calc(100vw-32px)] items-end gap-1 rounded-2xl border border-white/10 bg-surface/60 p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl backdrop-saturate-150 sm:gap-1.5 md:max-h-[calc(100vh-32px)] md:flex-col md:items-start"
        onMouseMove={(e) => {
          pointer.current = vertical ? e.clientY : e.clientX;
        }}
        onMouseLeave={release}
      >
        {PAGES.map((item, i) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="relative flex flex-col items-center md:flex-row">
              <Link
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onFocus={() => focusAt(i)}
                onBlur={release}
                className={`${ITEM} ${isActive ? "border-accent/40 text-accent" : "border-white/[0.07] text-foreground/80"}`}
                style={{ width: "var(--size, 44px)", height: "var(--size, 44px)" }}
              >
                <Icon aria-hidden className="h-[46%] w-[46%]" strokeWidth={1.75} />
                <span className={TOOLTIP}>{item.label}</span>
              </Link>
              <span
                aria-hidden
                className={`mt-1 h-1 w-1 rounded-full transition-all duration-300 md:mt-0 md:ml-1 ${isActive ? "bg-accent shadow-[0_0_8px_2px_var(--accent)]" : "bg-transparent"}`}
              />
            </li>
          );
        })}
        <li aria-hidden className="mx-0.5 mb-3 h-8 w-px self-center bg-white/10 md:mx-0 md:my-0.5 md:mb-0 md:h-px md:w-8" />
        <li className="relative flex flex-col items-center md:flex-row">
          <button
            ref={(el) => {
              itemRefs.current[themeIndex] = el;
              themeButtonRef.current = el;
            }}
            type="button"
            aria-label="Theme studio"
            aria-expanded={studioOpen}
            aria-haspopup="dialog"
            data-testid="dock-theme"
            onClick={() => setStudioOpen((open) => !open)}
            onFocus={() => focusAt(themeIndex)}
            onBlur={release}
            className={`${ITEM} ${studioOpen ? "border-accent/60 text-accent" : "border-white/[0.07] text-foreground/80"}`}
            style={{ width: "var(--size, 44px)", height: "var(--size, 44px)" }}
          >
            <Palette aria-hidden className="h-[46%] w-[46%]" strokeWidth={1.75} />
            <span className={TOOLTIP}>Theme</span>
          </button>
          <span aria-hidden className={`mt-1 h-1 w-1 rounded-full transition-all duration-300 md:mt-0 md:ml-1 ${studioOpen ? "bg-accent" : "bg-transparent"}`} />
        </li>
      </ul>
      <ThemeStudio open={studioOpen} onClose={closeStudio} anchorRef={themeButtonRef} />
    </nav>
  );
}
