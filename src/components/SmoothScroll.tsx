"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Inertial scrolling, driven by GSAP's ticker so ScrollTrigger and Lenis share one clock. */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Lower lerp + slightly damped wheel: longer, softer glide per scroll gesture.
    const lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.9, anchors: true, autoRaf: false });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // New page: start at the top (or at the #anchor), and let ScrollTrigger re-measure the new layout.
  // Skipped on first load, so an early scroll or the browser's restored position is never yanked back.
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const lenis = lenisRef.current;
    const target = window.location.hash ? document.querySelector<HTMLElement>(window.location.hash) : null;
    if (lenis) lenis.scrollTo(target ?? 0, { immediate: true, force: true });
    else if (target) target.scrollIntoView();
    ScrollTrigger.refresh();
  }, [pathname]);
  return null;
}
