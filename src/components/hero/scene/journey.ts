import * as THREE from "three";
import { LANES, sampleLane, type Lane } from "./topology";

/**
 * The hero request: client → gateway → service → PostgreSQL, then the response goes back through the service,
 * which writes it to Redis (cache-aside) before answering via the gateway to the browser.
 */
const LEGS: { lane: Lane; reverse: boolean }[] = [
  { lane: LANES.clients[0], reverse: false },
  { lane: LANES.gatewayToService[1], reverse: false },
  { lane: LANES.serviceToDb[1], reverse: false },
  { lane: LANES.serviceToDb[1], reverse: true },
  { lane: LANES.serviceToCache[1], reverse: false },
  { lane: LANES.serviceToCache[1], reverse: true },
  { lane: LANES.gatewayToService[1], reverse: true },
  { lane: LANES.clients[0], reverse: true },
];

const total = LEGS.reduce((sum, leg) => sum + leg.lane.length, 0);
const starts: number[] = [];
LEGS.reduce((acc, leg) => {
  starts.push(acc / total);
  return acc + leg.lane.length;
}, 0);

/** Journey position (0–1) at each node the request passes. */
export const JOURNEY_AT = {
  client: 0,
  gateway: starts[1],
  service: starts[2],
  db: starts[3],
  serviceBack: starts[4],
  cache: starts[5],
  serviceAfterCache: starts[6],
  gatewayBack: starts[7],
  clientBack: 1,
} as const;

/** From this point on the packet is the response. */
export const RESPONSE_FROM = JOURNEY_AT.db;

/** Writes the hero packet's position at journey fraction u into `out`. */
export function sampleJourney(u: number, out: THREE.Vector3) {
  const clamped = Math.min(Math.max(u, 0), 1);
  let i = LEGS.length - 1;
  while (i > 0 && clamped < starts[i]) i--;
  const leg = LEGS[i];
  const t = (clamped - starts[i]) / (leg.lane.length / total);
  return sampleLane(leg.lane, leg.reverse ? 1 - t : t, out);
}

export const JOURNEY_LENGTH = total;
