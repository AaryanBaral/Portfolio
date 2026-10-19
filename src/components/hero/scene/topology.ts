import * as THREE from "three";

export const COLORS = {
  cyan: new THREE.Color("#3fd0ff"),
  response: new THREE.Color("#c9f3ff"),
  violet: new THREE.Color("#9b7bff"),
  amber: new THREE.Color("#ffb547"),
  /** The hero request's response: distinct from all background traffic. */
  heroResponse: new THREE.Color("#5dffb0"),
  heroRequest: new THREE.Color("#8fe6ff"),
};

export const FLOOR_Y = -3.2;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** World positions of every component in the system, left (edge) to right (data). */
export const NODES = {
  clients: v(-15, 0.4, 0),
  gateway: v(-8.5, 0.4, 0),
  services: [v(-2.5, 2.3, -0.8), v(-2.5, 0.4, 0.7), v(-2.5, -1.5, -0.8)],
  cache: v(4, 3.3, -1.2),
  queue: v(4, -1.7, 1.6),
  worker: v(8, -1.7, 1.6),
  db: v(11, 0.2, 0),
} as const;

export type NodeKey = "clients" | "gateway" | "services" | "cache" | "queue" | "worker" | "db";

/** A curve pre-sampled at uniform arc length, so packets move at constant speed without per-frame arc-length maths. */
export type Lane = { points: Float32Array; samples: number; length: number; curve: THREE.Curve<THREE.Vector3> };

function arc(a: THREE.Vector3, b: THREE.Vector3, lift: number, sideways = 0): Lane {
  const mid = a.clone().lerp(b, 0.5).add(v(0, lift, sideways));
  const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  const samples = 96;
  const pts = curve.getSpacedPoints(samples);
  const points = new Float32Array((samples + 1) * 3);
  pts.forEach((p, i) => p.toArray(points, i * 3));
  return { points, samples, length: curve.getLength(), curve };
}

/** Writes the point at fraction t (0–1) of a lane into `out`. */
export function sampleLane(lane: Lane, t: number, out: THREE.Vector3) {
  const f = Math.min(Math.max(t, 0), 1) * lane.samples;
  const i = Math.min(Math.floor(f), lane.samples - 1);
  const k = f - i;
  const p = lane.points;
  const j = i * 3;
  out.set(
    p[j] + (p[j + 3] - p[j]) * k,
    p[j + 1] + (p[j + 4] - p[j + 1]) * k,
    p[j + 2] + (p[j + 5] - p[j + 2]) * k,
  );
  return out;
}

/** Entry points on the "internet" globe: traffic arrives from many directions. */
const CLIENT_ORIGINS = [
  v(-14.2, 1.5, 1.0),
  v(-14.0, -0.6, -1.1),
  v(-14.4, 0.9, -1.3),
  v(-13.9, -0.1, 1.4),
  v(-14.6, 1.9, 0.1),
  v(-14.1, -1.0, 0.3),
];

export const LANES = {
  clients: CLIENT_ORIGINS.map((o, i) => arc(o, NODES.gateway, 0.6 + (i % 3) * 0.5, (i % 2 ? 1 : -1) * 0.8)),
  gatewayToService: NODES.services.map((s) => arc(NODES.gateway, s, 0.8)),
  serviceToCache: NODES.services.map((s) => arc(s, NODES.cache, 1.2)),
  serviceToDb: NODES.services.map((s, i) => arc(s, NODES.db, -0.6 + i * 0.4, 1.6)),
  serviceToQueue: NODES.services.map((s) => arc(s, NODES.queue, -0.8)),
  queueToWorker: arc(NODES.queue, NODES.worker, 0.4),
  workerToDb: arc(NODES.worker, NODES.db, 0.6),
};

/** Every lane, for drawing the links. */
export const ALL_LANES: { lane: Lane; kind: "edge" | "core" | "async" }[] = [
  ...LANES.clients.map((lane) => ({ lane, kind: "edge" as const })),
  ...LANES.gatewayToService.map((lane) => ({ lane, kind: "core" as const })),
  ...LANES.serviceToCache.map((lane) => ({ lane, kind: "core" as const })),
  ...LANES.serviceToDb.map((lane) => ({ lane, kind: "core" as const })),
  ...LANES.serviceToQueue.map((lane) => ({ lane, kind: "async" as const })),
  { lane: LANES.queueToWorker, kind: "async" },
  { lane: LANES.workerToDb, kind: "async" },
];

export type Hop = {
  lane: Lane;
  reverse: boolean;
  color: THREE.Color;
  /** Node that "receives" the packet at the end of this hop (pulses on arrival). */
  arrive: NodeKey | null;
  serviceIndex?: number;
  /** Rejected packets stop just short of the gate and bounce back. */
  stopAt?: number;
  fade?: boolean;
};

export type RouteKind = "cacheHit" | "cacheMiss" | "write" | "rejected";

/** The journey of one request, chosen at spawn. The colours change as the request changes meaning. */
export function buildRoute(kind: RouteKind, laneIndex: number, serviceIndex: number): Hop[] {
  const client = LANES.clients[laneIndex];
  const toSvc = LANES.gatewayToService[serviceIndex];
  const s = serviceIndex;
  switch (kind) {
    case "rejected":
      return [
        { lane: client, reverse: false, color: COLORS.cyan, arrive: "gateway", stopAt: 0.94 },
        { lane: client, reverse: true, color: COLORS.amber, arrive: null, fade: true },
      ];
    case "cacheHit":
      return [
        { lane: client, reverse: false, color: COLORS.cyan, arrive: "gateway" },
        { lane: toSvc, reverse: false, color: COLORS.cyan, arrive: "services", serviceIndex: s },
        { lane: LANES.serviceToCache[s], reverse: false, color: COLORS.cyan, arrive: "cache" },
        { lane: LANES.serviceToCache[s], reverse: true, color: COLORS.response, arrive: "services", serviceIndex: s },
        { lane: toSvc, reverse: true, color: COLORS.response, arrive: "gateway" },
        { lane: client, reverse: true, color: COLORS.response, arrive: null, fade: true },
      ];
    case "cacheMiss":
      return [
        { lane: client, reverse: false, color: COLORS.cyan, arrive: "gateway" },
        { lane: toSvc, reverse: false, color: COLORS.cyan, arrive: "services", serviceIndex: s },
        { lane: LANES.serviceToDb[s], reverse: false, color: COLORS.cyan, arrive: "db" },
        { lane: LANES.serviceToDb[s], reverse: true, color: COLORS.response, arrive: "services", serviceIndex: s },
        { lane: toSvc, reverse: true, color: COLORS.response, arrive: "gateway" },
        { lane: client, reverse: true, color: COLORS.response, arrive: null, fade: true },
      ];
    case "write":
      return [
        { lane: client, reverse: false, color: COLORS.cyan, arrive: "gateway" },
        { lane: toSvc, reverse: false, color: COLORS.cyan, arrive: "services", serviceIndex: s },
        { lane: LANES.serviceToQueue[s], reverse: false, color: COLORS.violet, arrive: "queue" },
        { lane: LANES.queueToWorker, reverse: false, color: COLORS.violet, arrive: "worker" },
        { lane: LANES.workerToDb, reverse: false, color: COLORS.violet, arrive: "db", fade: true },
      ];
  }
}
