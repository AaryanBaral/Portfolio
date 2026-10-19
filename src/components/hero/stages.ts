import { JOURNEY_AT } from "./scene/journey";

export type Vec3 = { x: number; y: number; z: number };

/** Wide establishing shots before and after the journey. */
export const OVERVIEW = {
  start: { position: [-2.4, 7.5, 31], target: [-2.2, -0.3, 0] },
  end: { position: [-2.4, 18, 23], target: [-2.2, -1.2, 0] },
} as const;

export type JourneyStage = {
  eyebrow: string;
  title: string;
  body: string;
  /** Journey position the request travels to during this stage. */
  to: number;
  /** Camera offset from the request while this stage plays. */
  offset: Vec3;
  /** Scroll "duration" of the travel and of the pause after it (timeline units). */
  travel: number;
  hold: number;
};

/** One request, end to end. The GSAP scroll timeline plays these in order. */
export const JOURNEY_STAGES: JourneyStage[] = [
  {
    eyebrow: "01 — The request",
    title: "A request leaves the browser.",
    body: "GET /api/visits/summary. Follow it through every layer of the system and back.",
    to: JOURNEY_AT.gateway,
    offset: { x: -3.6, y: 1.3, z: 5.4 },
    travel: 1.1,
    hold: 0.8,
  },
  {
    eyebrow: "02 — Reverse proxy",
    title: "The gateway inspects it first.",
    body: "Rate limiter: allowed. Edge cache: miss, so it is forwarded. The amber requests around it are being turned away with 429.",
    to: JOURNEY_AT.gateway,
    offset: { x: -2.4, y: 0.9, z: 4.2 },
    travel: 0,
    hold: 1.4,
  },
  {
    eyebrow: "03 — .NET backend",
    title: "Forwarded to a service.",
    body: "A stateless ASP.NET Core handler validates the request and checks Redis first. Miss: it has to ask the database.",
    to: JOURNEY_AT.service,
    offset: { x: -1.6, y: 1.9, z: 6.6 },
    travel: 1.1,
    hold: 0.8,
  },
  {
    eyebrow: "04 — PostgreSQL",
    title: "One indexed query.",
    body: "The visits table is scanned through ix_visits_created_at: a few milliseconds, no full scan.",
    to: JOURNEY_AT.db,
    offset: { x: -3.4, y: 2.3, z: 7.6 },
    travel: 1.1,
    hold: 0.8,
  },
  {
    eyebrow: "05 — Redis",
    title: "Saved to Redis on the way back.",
    body: "Before answering, the service writes the result to Redis with a TTL. The next request for it never touches PostgreSQL.",
    to: JOURNEY_AT.cache,
    offset: { x: -2.2, y: 1.4, z: 5.6 },
    travel: 1.1,
    hold: 0.8,
  },
  {
    eyebrow: "06 — The response",
    title: "And all the way back.",
    body: "Service → gateway (cached at the edge for the next visitor) → browser. 200 OK.",
    to: JOURNEY_AT.clientBack,
    offset: { x: -0.8, y: 2.6, z: 7.6 },
    travel: 1.6,
    hold: 0.6,
  },
];

/** Tolerance for "has reached this node", shared by the tag and the trace so they always agree. */
export const REACHED = 0.003;

/** Live tag that rides on the hero request, by journey position. */
export function requestTag(u: number): { text: string; response: boolean } {
  if (u < JOURNEY_AT.gateway - REACHED) return { text: "GET /api/visits/summary", response: false };
  if (u < JOURNEY_AT.service - REACHED) return { text: "✓ rate limit · edge cache MISS → forward", response: false };
  if (u < JOURNEY_AT.db - REACHED) return { text: "ASP.NET Core · VisitService", response: false };
  if (u < JOURNEY_AT.db + 0.015) return { text: "SELECT … ix_visits_created_at", response: false };
  if (u < JOURNEY_AT.cache - REACHED) return { text: "rows → VisitService", response: true };
  if (u < JOURNEY_AT.cache + 0.015) return { text: "SET visits:summary EX 30 → Redis", response: true };
  if (u < JOURNEY_AT.gatewayBack + 0.01) return { text: "200 OK · application/json", response: true };
  return { text: "200 OK · cached at edge", response: true };
}

/** Steps shown in the request inspector, lit as the request passes them. */
export const INSPECTOR_STEPS: { label: string; at: number }[] = [
  { label: "Browser", at: JOURNEY_AT.client },
  { label: "Gateway · rate limit + cache", at: JOURNEY_AT.gateway },
  { label: ".NET service", at: JOURNEY_AT.service },
  { label: "PostgreSQL", at: JOURNEY_AT.db },
  { label: "Redis · cache the result", at: JOURNEY_AT.cache },
  { label: "Gateway · edge cache", at: JOURNEY_AT.gatewayBack },
  { label: "Browser · 200 OK", at: JOURNEY_AT.clientBack - 0.002 },
];
