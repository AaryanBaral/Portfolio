/**
 * Mutable state shared between the GSAP scroll timeline, the DOM overlays and the WebGL scene.
 * A plain object instead of React state: all three read or write it every frame.
 */
export const heroStore = {
  /** Scroll progress through the hero, 0–1. */
  progress: 0,
  /** Where the hero request is on its round trip, 0–1 (see journey.ts). */
  journey: 0,
  /** 0 = wide overview camera, 1 = camera tracking the hero request. */
  follow: 0,
  /** 0 = opening overview, 1 = closing overview. */
  overview: 0,
  /** Camera offset from the hero request while tracking it (tweened per stage). */
  offset: { x: -3, y: 1.6, z: 6.5 },
  /** Arrival pulses per node, decaying to 0. */
  pulse: { gateway: 0, gatewayReject: 0, services: [0, 0, 0], cache: 0, queue: 0, worker: 0, db: 0 },
  /** Running totals from the background traffic simulation (shown in the HUD). */
  stats: { requests: 0, rejected: 0, cacheHits: 0, cacheMisses: 0, writes: 0, queueDepth: 0 },
  /** True during a simulated traffic spike (rate limiter visibly engages). */
  spike: false,
};

export type HeroStore = typeof heroStore;
