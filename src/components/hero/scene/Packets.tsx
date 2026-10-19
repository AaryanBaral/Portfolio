"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heroStore } from "../heroStore";
import { COLORS, LANES, buildRoute, sampleLane, type Hop, type RouteKind } from "./topology";

type Packet = {
  active: boolean;
  kind: RouteKind;
  route: Hop[];
  hop: number;
  t: number;
  speed: number;
  age: number;
};

const SPIKE_EVERY = 12;
const SPIKE_LENGTH = 3.5;

/** Route mix in calm traffic vs. during a spike (when the rate limiter starts turning requests away). */
const MIX_CALM: [RouteKind, number][] = [["rejected", 0.04], ["cacheHit", 0.5], ["cacheMiss", 0.2], ["write", 0.26]];
const MIX_SPIKE: [RouteKind, number][] = [["rejected", 0.46], ["cacheHit", 0.3], ["cacheMiss", 0.09], ["write", 0.15]];

function pickKind(mix: [RouteKind, number][]): RouteKind {
  let r = Math.random();
  for (const [kind, weight] of mix) {
    if ((r -= weight) <= 0) return kind;
  }
  return "cacheHit";
}

export function Packets({ max, rate }: { max: number; rate: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const packets = useMemo<Packet[]>(
    () => Array.from({ length: max }, () => ({ active: false, kind: "cacheHit", route: [], hop: 0, t: 0, speed: 6, age: 0 })),
    [max],
  );
  const sim = useRef({ spawn: 0, clock: 0, cursor: 0, service: 0 });

  const geometry = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.04, 0.42, 4, 10);
    g.rotateX(Math.PI / 2); // long axis along +Z, which Object3D.lookAt points at the travel direction
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const tmp = useMemo(
    () => ({ pos: new THREE.Vector3(), ahead: new THREE.Vector3(), dummy: new THREE.Object3D(), color: new THREE.Color() }),
    [],
  );

  useFrame((_, rawDt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(rawDt, 1 / 30);
    const s = sim.current;
    const { pulse, stats } = heroStore;
    s.clock += dt;

    const spike = s.clock % SPIKE_EVERY > SPIKE_EVERY - SPIKE_LENGTH;
    heroStore.spike = spike;

    // Spawn new requests.
    s.spawn += rate * (spike ? 2.8 : 1) * dt;
    while (s.spawn >= 1) {
      s.spawn -= 1;
      let slot = -1;
      for (let n = 0; n < max; n++) {
        const i = (s.cursor + n) % max;
        if (!packets[i].active) {
          slot = i;
          break;
        }
      }
      if (slot < 0) break;
      s.cursor = (slot + 1) % max;
      const kind = pickKind(spike ? MIX_SPIKE : MIX_CALM);
      const lane = Math.floor(Math.random() * LANES.clients.length);
      s.service = (s.service + 1) % 3;
      const p = packets[slot];
      p.active = true;
      p.kind = kind;
      p.route = buildRoute(kind, lane, s.service);
      p.hop = 0;
      p.t = 0;
      p.age = 0;
      p.speed = 5.5 + Math.random() * 2.5;
      stats.requests++;
      if (kind === "rejected") stats.rejected++;
      else if (kind === "cacheHit") stats.cacheHits++;
      else if (kind === "cacheMiss") stats.cacheMisses++;
      else stats.writes++;
    }

    // Decay node pulses.
    const decay = Math.exp(-dt * 4.5);
    pulse.gateway *= decay;
    pulse.gatewayReject *= Math.exp(-dt * 3);
    pulse.cache *= decay;
    pulse.queue *= decay;
    pulse.worker *= decay;
    pulse.db *= decay;
    for (let i = 0; i < 3; i++) pulse.services[i] *= decay;

    // Advance and draw.
    let drawn = 0;
    for (const p of packets) {
      if (!p.active) continue;
      p.age += dt;
      let hop = p.route[p.hop];
      const stop = hop.stopAt ?? 1;
      p.t += (p.speed * dt) / hop.lane.length;
      if (p.t >= stop) {
        arrive(hop, p.kind);
        p.hop++;
        if (p.hop >= p.route.length) {
          p.active = false;
          continue;
        }
        const next = p.route[p.hop];
        // A bounce resumes from where the previous hop stopped.
        p.t = next.reverse && next.lane === hop.lane ? 1 - stop : 0;
        hop = next;
      }

      const param = hop.reverse ? 1 - p.t : p.t;
      sampleLane(hop.lane, param, tmp.pos);
      sampleLane(hop.lane, hop.reverse ? param - 0.02 : param + 0.02, tmp.ahead);

      let scale = Math.min(1, p.age * 5);
      if (hop.fade) scale *= Math.min(1, (1 - p.t) / 0.45);
      tmp.dummy.position.copy(tmp.pos);
      if (tmp.ahead.distanceToSquared(tmp.pos) > 1e-10) tmp.dummy.lookAt(tmp.ahead);
      tmp.dummy.scale.set(scale, scale, scale);
      tmp.dummy.updateMatrix();
      mesh.setMatrixAt(drawn, tmp.dummy.matrix);
      // Responses are slightly dimmer than requests so the direction of travel reads at a glance.
      tmp.color.copy(hop.color).multiplyScalar(hop.color === COLORS.response ? 1.4 : 2.4);
      mesh.setColorAt(drawn, tmp.color);
      drawn++;
    }
    mesh.count = drawn;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, max]} frustumCulled={false} />;
}

function arrive(hop: Hop, kind: RouteKind) {
  const { pulse, stats } = heroStore;
  switch (hop.arrive) {
    case "gateway":
      if (kind === "rejected") pulse.gatewayReject = Math.min(1, pulse.gatewayReject + 0.25);
      else pulse.gateway = Math.min(1, pulse.gateway + 0.12);
      break;
    case "services":
      if (hop.serviceIndex !== undefined) pulse.services[hop.serviceIndex] = Math.min(1, pulse.services[hop.serviceIndex] + 0.2);
      break;
    case "cache":
      pulse.cache = Math.min(1, pulse.cache + 0.18);
      break;
    case "queue":
      pulse.queue = Math.min(1, pulse.queue + 0.25);
      stats.queueDepth++;
      break;
    case "worker":
      pulse.worker = Math.min(1, pulse.worker + 0.3);
      stats.queueDepth = Math.max(0, stats.queueDepth - 1);
      break;
    case "db":
      pulse.db = Math.min(1, pulse.db + 0.15);
      break;
  }
}
