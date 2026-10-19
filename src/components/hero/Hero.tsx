"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { heroStore } from "./heroStore";
import type { NodeKey } from "./scene/topology";
import { INSPECTOR_STEPS, JOURNEY_STAGES, REACHED, requestTag } from "./stages";
import { StaticArchitecture } from "./StaticArchitecture";

gsap.registerPlugin(ScrollTrigger);

const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

const LABELS: Record<NodeKey, [string, string]> = {
  clients: ["Browser", "the client"],
  gateway: ["Reverse proxy", "rate limit · edge cache"],
  services: [".NET services", "ASP.NET Core · ×3"],
  cache: ["Redis", "cache"],
  queue: ["Queue", "async writes"],
  worker: ["Workers", "background jobs"],
  db: ["PostgreSQL", "source of truth"],
};

const HUD_ROWS: [string, string][] = [
  ["requests", "requests"],
  ["rate-limited", "rejected"],
  ["cache hit", "cache"],
  ["queue depth", "queue"],
];

const LEGEND: [string, string][] = [
  ["#8fe6ff", "your request"],
  ["#5dffb0", "its response"],
  ["#3fd0ff", "traffic"],
  ["#ffb547", "429 rejected"],
  ["#9b7bff", "queued write"],
];

function useMedia(query: string, serverValue: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

let webglSupport: boolean | undefined;
function hasWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

/**
 * Immersive mode: while the journey plays, the page dock and social bar slide out so the scene gets the
 * whole screen (styles keyed on html[data-immersive] in globals.css). At the very top and after the hero
 * they come back, so navigation is always one scroll away.
 */
const IMMERSIVE_FROM = 0.015;
const IMMERSIVE_UNTIL = 0.97;
function setImmersive(on: boolean) {
  const root = document.documentElement;
  if (on) root.dataset.immersive = "true";
  else delete root.dataset.immersive;
}

export function Hero() {
  const reduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const mobile = useMedia("(max-width: 767px)", false);
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);
  const animated = webgl && !reduced;

  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const tagTextRef = useRef<HTMLSpanElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const labelRefs = useRef<Partial<Record<NodeKey, HTMLDivElement | null>>>({});
  const hud = useRef<Record<string, HTMLElement | null>>({});
  const [active, setActive] = useState(true);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !animated) return;
    const s = heroStore;
    s.journey = 0;
    s.follow = 0;
    s.overview = 0;
    Object.assign(s.offset, JOURNEY_STAGES[0].offset);

    // One scrubbed timeline drives the request, the camera and every caption, so they never drift apart.
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          // A touch more smoothing so a fast flick of the wheel can't skip a stage.
          scrub: 1,
          onUpdate: (self) => {
            s.progress = self.progress;
            setImmersive(self.progress > IMMERSIVE_FROM && self.progress < IMMERSIVE_UNTIL);
          },
          onLeave: () => setImmersive(false),
          onLeaveBack: () => setImmersive(false),
        },
      });

      tl.to(introRef.current, { autoAlpha: 0, y: -24, duration: 0.5, ease: "power1.in" }, 0.5);
      tl.to(s, { follow: 1, duration: 1.3, ease: "power3.inOut" }, 0.6);

      let t = 1.7;
      JOURNEY_STAGES.forEach((stage, i) => {
        const caption = captionRefs.current[i];
        const span = stage.travel + stage.hold;
        tl.to(s.offset, { ...stage.offset, duration: Math.max(0.6, stage.travel), ease: "sine.inOut" }, t);
        if (stage.travel > 0) tl.to(s, { journey: stage.to, duration: stage.travel }, t);
        tl.fromTo(caption, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" }, t + 0.05);
        tl.to(caption, { autoAlpha: 0, y: -14, duration: 0.3, ease: "power2.in" }, t + span - 0.3);
        t += span;
      });

      tl.to(s, { follow: 0, duration: 1.3, ease: "power3.inOut" }, t);
      tl.to(s, { overview: 1, duration: 1.5 }, t);
      tl.fromTo(outroRef.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, t + 1);
      tl.to({}, { duration: 0.8 }, t + 1.5);
    }, section);

    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "120px" });
    // Leaving the page mid-journey must not leave the docks hidden.
    const restoreChrome = () => setImmersive(false);
    io.observe(section);

    // Overlays that follow the simulation rather than the timeline.
    let raf = 0;
    let lastHud = 0;
    let lastTag = "";
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const u = s.journey;
      if (progressRef.current) progressRef.current.style.transform = `scaleY(${s.progress})`;
      if (inspectorRef.current) inspectorRef.current.style.opacity = String(Math.max(0, (s.follow - 0.3) / 0.7));

      let current = -1;
      INSPECTOR_STEPS.forEach((step, i) => {
        if (u >= step.at - REACHED) current = i;
      });
      stepRefs.current.forEach((el, i) => {
        if (el) el.dataset.state = i < current ? "done" : i === current ? "current" : "pending";
      });

      const tag = requestTag(u);
      if (tagTextRef.current && tag.text !== lastTag) {
        lastTag = tag.text;
        tagTextRef.current.textContent = tag.text;
        tagRef.current?.toggleAttribute("data-response", tag.response);
      }

      if (now - lastHud > 250) {
        lastHud = now;
        const st = s.stats;
        const reads = st.cacheHits + st.cacheMisses;
        const set = (k: string, text: string) => {
          const el = hud.current[k];
          if (el && el.textContent !== text) el.textContent = text;
        };
        set("requests", st.requests.toLocaleString("en-US"));
        set("rejected", `${st.requests ? ((st.rejected / st.requests) * 100).toFixed(1) : "0.0"}%`);
        set("cache", `${reads ? ((st.cacheHits / reads) * 100).toFixed(0) : "0"}%`);
        set("queue", String(st.queueDepth));
        if (hud.current.spike) hud.current.spike.style.opacity = s.spike ? "1" : "0";
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      restoreChrome();
      ctx.revert();
    };
  }, [animated]);

  if (!animated) {
    return (
      <section aria-label="Introduction" className="relative flex min-h-svh flex-col justify-center pt-16 pb-32">
        <div className="page-container">
          <Intro />
          <StaticArchitecture className="mt-12 w-full max-w-4xl" />
          <a href="#featured" className="mt-10 inline-block rounded-full border border-accent/40 bg-accent-soft px-5 py-2 text-sm font-medium text-accent transition hover:bg-hover hover:text-on-accent">
            See the highlighted project ↓
          </a>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} aria-label="Introduction: follow one request through the system" className="relative h-[720vh]">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_srgb,var(--accent)_7%,var(--background))_0%,var(--background)_65%)]" />
        <Scene mobile={mobile} active={active} labelRefs={labelRefs} tagRef={tagRef} />

        {/* Labels positioned every frame by the scene's projector. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {(Object.keys(LABELS) as NodeKey[]).map((key) => (
            <div
              key={key}
              ref={(el) => {
                labelRefs.current[key] = el;
              }}
              className="absolute top-0 left-0 text-center whitespace-nowrap opacity-0 transition-opacity duration-500"
            >
              <p className="text-[11px] font-medium tracking-wide md:text-xs">{LABELS[key][0]}</p>
              <p className="font-mono text-[9px] text-muted md:text-[10px]">{LABELS[key][1]}</p>
            </div>
          ))}
          <div
            ref={tagRef}
            className="group absolute top-0 left-0 opacity-0"
          >
            <span className="flex items-center gap-1.5 rounded-full border border-[#8fe6ff]/40 bg-[#06141b]/80 px-2.5 py-1 font-mono text-[10px] whitespace-nowrap text-[#bdf0ff] shadow-[0_0_18px_-4px_rgba(143,230,255,0.6)] backdrop-blur group-data-[response]:border-[#5dffb0]/50 group-data-[response]:text-[#b6ffd9] group-data-[response]:shadow-[0_0_18px_-4px_rgba(93,255,176,0.6)] md:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8fe6ff] group-data-[response]:bg-[#5dffb0]" />
              <span ref={tagTextRef}>GET /api/visits/summary</span>
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="page-container pointer-events-none absolute inset-0">
          <div ref={introRef} className="absolute bottom-32 left-6 right-6 md:bottom-36 md:left-10 md:right-auto md:max-w-xl">
            <Intro />
            <p className="mt-8 flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              <span className="h-px w-8 bg-accent/60" /> Scroll to follow one request
            </p>
          </div>

          {JOURNEY_STAGES.map((stage, i) => (
            <div
              key={stage.eyebrow}
              ref={(el) => {
                captionRefs.current[i] = el;
              }}
              className="invisible absolute bottom-32 left-6 right-6 opacity-0 md:bottom-36 md:left-10 md:right-auto md:max-w-md"
            >
              <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">{stage.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-medium tracking-tight md:text-4xl">{stage.title}</h2>
              <p className="mt-3 text-sm text-muted md:text-base">{stage.body}</p>
            </div>
          ))}

          <div ref={outroRef} className="invisible absolute inset-x-6 bottom-32 flex flex-col items-center gap-3 text-center opacity-0">
            <p className="text-lg font-medium md:text-2xl">That round trip runs behind this site.</p>
            <p className="max-w-md text-sm text-muted">Watch it live, or break it in the sandbox.</p>
            <a href="#featured" className="pointer-events-auto mt-2 rounded-full border border-accent/40 bg-accent-soft px-5 py-2 text-sm font-medium text-accent transition hover:bg-hover hover:text-on-accent">
              See the highlighted project ↓
            </a>
          </div>
        </div>

        {/* Request inspector: which hop the request is on. */}
        <div
          ref={inspectorRef}
          className="pointer-events-none absolute top-6 left-6 hidden w-60 rounded-xl border border-border/70 bg-surface/50 p-3 opacity-0 backdrop-blur-md md:left-10 md:block"
        >
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase">Request trace</p>
          <p className="mt-1 font-mono text-[11px] text-foreground">GET /api/visits/summary</p>
          <ol className="mt-3 space-y-1.5">
            {INSPECTOR_STEPS.map((step, i) => (
              <li
                key={`${step.label}-${i}`}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-state="pending"
                className="group flex items-center gap-2 text-[11px] text-muted/60 transition-colors duration-300 data-[state=current]:text-foreground data-[state=done]:text-muted"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-muted/50 transition-all duration-300 group-data-[state=current]:border-accent group-data-[state=current]:bg-accent group-data-[state=current]:shadow-[0_0_8px_2px_var(--accent)] group-data-[state=done]:border-[#5dffb0]/70 group-data-[state=done]:bg-[#5dffb0]/70" />
                {step.label}
              </li>
            ))}
          </ol>
        </div>

        {/* Telemetry from the background traffic simulation + colour legend. */}
        <div className="pointer-events-none absolute top-6 right-4 hidden w-52 rounded-xl border border-border/70 bg-surface/50 p-3 font-mono text-[10px] leading-5 text-muted backdrop-blur-md md:block">
          <p className="mb-1 text-[9px] tracking-[0.2em] uppercase">Simulated traffic</p>
          {HUD_ROWS.map(([label, k]) => (
            <p key={k} className="flex justify-between">
              <span>{label}</span>
              <span
                ref={(el) => {
                  hud.current[k] = el;
                }}
                className="text-foreground"
              >
                0
              </span>
            </p>
          ))}
          <p
            ref={(el) => {
              hud.current.spike = el;
            }}
            className="text-[#ffb547] opacity-0 transition-opacity duration-300"
          >
            ▲ spike: limiter engaged
          </p>
          <ul className="mt-2 space-y-0.5 border-t border-border/70 pt-2">
            {LEGEND.map(([color, label]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="h-1.5 w-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute top-1/2 right-4 hidden h-32 w-px translate-y-8 bg-border md:block">
          <div ref={progressRef} className="h-full w-full origin-top scale-y-0 bg-accent" />
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <>
      <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">Backend Engineer · .NET · PostgreSQL</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-7xl">Aaryan Baral</h1>
      <p className="mt-4 text-base text-muted md:text-lg">
        I build the systems behind the screen: APIs, data and infrastructure that stay fast and correct under load.
      </p>
    </>
  );
}
