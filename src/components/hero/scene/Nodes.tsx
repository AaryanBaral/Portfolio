"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useTheme } from "@/lib/useTheme";
import { heroStore } from "../heroStore";
import { COLORS, FLOOR_Y, NODES } from "./topology";

/*
 * Every component of the system as a detailed, code-built model. Repeated detail (LEDs, vents, drive bays,
 * rollers) is instanced, so the extra realism costs a handful of draw calls rather than hundreds.
 */

// ---- shared materials ------------------------------------------------------------------------

let shared: ReturnType<typeof createMaterials> | null = null;

function createMaterials() {
  return {
    /** Dark anodised aluminium: the body of every unit. */
    chassis: new THREE.MeshPhysicalMaterial({
      color: "#121821",
      metalness: 0.85,
      roughness: 0.34,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
    }),
    /** Bright machined metal: handles, rails, bevels. */
    trim: new THREE.MeshPhysicalMaterial({ color: "#5b6676", metalness: 1, roughness: 0.2, clearcoat: 0.4 }),
    /** Matte black inserts: bezels, grilles, drive caddies. */
    panel: new THREE.MeshStandardMaterial({ color: "#07090d", metalness: 0.4, roughness: 0.55 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#0a1a24",
      metalness: 0.2,
      roughness: 0.06,
      transparent: true,
      opacity: 0.5,
      clearcoat: 1,
    }),
    /** Per-instance coloured LEDs (instanceColor carries brightness). */
    led: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
  };
}

function useMaterials() {
  if (!shared) shared = createMaterials();
  return shared;
}

const glow = (color: THREE.Color, k: number) => new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(k), toneMapped: false });
const line = (color: THREE.Color, opacity: number) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false });

function setGlow(material: THREE.MeshBasicMaterial | THREE.LineBasicMaterial, base: THREE.Color, k: number) {
  material.color.copy(base).multiplyScalar(k);
}

/** Disposes GPU resources a component created itself, once, when it unmounts. */
function useDispose(...resources: { dispose(): void }[]) {
  // First-render list only: the resources are memoised, and re-renders must never dispose live ones.
  const list = useRef(resources);
  useEffect(() => {
    const owned = list.current;
    return () => owned.forEach((r) => r.dispose());
  }, []);
}

/** Builds an InstancedMesh once, placing instance i via `place`. */
function useInstances(
  count: number,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  place: (i: number, o: THREE.Object3D) => void,
  colored = false,
) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, count);
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      place(i, o);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (colored) m.setColorAt(i, new THREE.Color(0, 0, 0));
    }
    m.instanceMatrix.needsUpdate = true;
    return m;
    // Geometry/material/layout are fixed for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, geometry, material]);
  useEffect(() => () => mesh.dispose(), [mesh]);
  return mesh;
}

const tmpColor = new THREE.Color();
/** LEDs that idle dimly and flicker brighter with activity `k` (0–1), like real disk lights. */
function flickerLeds(mesh: THREE.InstancedMesh, base: THREE.Color, k: number, t: number, seed: number) {
  for (let i = 0; i < mesh.count; i++) {
    const noise = Math.sin(t * (7 + (i % 5) * 3.1) + i * 12.9898 + seed) * 0.5 + 0.5;
    const on = 0.35 + k * 2.6 * (noise > 0.45 ? 1 : 0.15) + noise * 0.25;
    mesh.setColorAt(i, tmpColor.copy(base).multiplyScalar(on));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// ---- browser -----------------------------------------------------------------------------------

/** A browser window, drawn once per theme accent: tab bar, address bar, and a little page. */
function drawBrowser(accent: string) {
  const w = 1024;
  const h = 640;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  const round = (x: number, y: number, rw: number, rh: number, r: number, fill: string) => {
    c.fillStyle = fill;
    c.beginPath();
    c.roundRect(x, y, rw, rh, r);
    c.fill();
  };
  c.fillStyle = "#0a0f15";
  c.fillRect(0, 0, w, h);
  round(0, 0, w, 72, 0, "#121a23");
  ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => {
    c.fillStyle = col;
    c.globalAlpha = 0.8;
    c.beginPath();
    c.arc(36 + i * 30, 36, 9, 0, Math.PI * 2);
    c.fill();
  });
  c.globalAlpha = 1;
  round(150, 18, 600, 36, 18, "#0a0f15");
  c.fillStyle = "#8a93a0";
  c.font = "500 20px ui-monospace, Menlo, monospace";
  c.fillText("aaryan.dev  ›  GET /api/visits/summary", 176, 43);

  const grad = c.createLinearGradient(60, 120, 700, 300);
  grad.addColorStop(0, accent);
  grad.addColorStop(1, "#ffffff");
  c.fillStyle = grad;
  c.font = "700 64px system-ui, sans-serif";
  c.fillText("200 OK", 60, 190);
  c.fillStyle = "#e8eaed";
  c.font = "400 26px system-ui, sans-serif";
  c.fillText("Visits in the last 24 hours", 60, 236);
  for (let i = 0; i < 3; i++) round(60 + i * 310, 280, 280, 150, 18, "#121a23");
  c.fillStyle = accent;
  c.font = "700 46px ui-monospace, Menlo, monospace";
  ["12,408", "38ms", "97%"].forEach((v, i) => c.fillText(v, 86 + i * 310, 370));
  c.fillStyle = "#8a93a0";
  c.font = "400 20px system-ui, sans-serif";
  ["requests", "p95 latency", "cache hits"].forEach((v, i) => c.fillText(v, 86 + i * 310, 404));
  for (let i = 0; i < 4; i++) round(60, 470 + i * 34, 520 - i * 90, 14, 7, "#1a2430");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function Clients() {
  const { chassis, trim, panel } = useMaterials();
  const { accent } = useTheme().tokens;
  const frame = useMemo(() => new RoundedBoxGeometry(3.3, 2.1, 0.16, 6, 0.09), []);
  const base = useMemo(() => new RoundedBoxGeometry(1.3, 0.07, 0.7, 4, 0.03), []);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const ringMat = useMemo(() => glow(COLORS.cyan, 1.2), []);
  useDispose(frame, base, screenMat, ringMat);

  useEffect(() => {
    const texture = drawBrowser(accent);
    screenMat.map = texture;
    screenMat.color.setScalar(1.15); // a touch over 1 so the screen reads as lit and blooms faintly
    screenMat.needsUpdate = true;
    return () => texture.dispose();
  }, [accent, screenMat]);

  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) group.current.position.y = NODES.clients.y + Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
  });

  return (
    <group position={NODES.clients}>
      <group ref={group} rotation={[0, 0.38, 0]}>
        <mesh geometry={frame} material={chassis} />
        <mesh material={screenMat} position={[0, 0, 0.082]}>
          <planeGeometry args={[3.1, 1.92]} />
        </mesh>
        {/* stand */}
        <mesh material={trim} position={[0, -1.45, -0.12]}>
          <boxGeometry args={[0.18, 0.85, 0.1]} />
        </mesh>
        <mesh geometry={base} material={panel} position={[0, -1.9, -0.05]} />
      </group>
      {/* The wider internet the traffic arrives from. */}
      <mesh material={ringMat} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <torusGeometry args={[2.3, 0.008, 8, 180]} />
      </mesh>
    </group>
  );
}

// ---- gateway -----------------------------------------------------------------------------------

function hexRing(outer: number, inner: number, depth: number) {
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const [ox, oy, ix, iy] = [Math.cos(a) * outer, Math.sin(a) * outer, Math.cos(a) * inner, Math.sin(a) * inner];
    if (i === 0) {
      shape.moveTo(ox, oy);
      hole.moveTo(ix, iy);
    } else {
      shape.lineTo(ox, oy);
      hole.lineTo(ix, iy);
    }
  }
  shape.closePath();
  hole.closePath();
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function Gateway() {
  const { chassis, trim, panel } = useMaterials();
  const frame = useMemo(() => hexRing(2.45, 2.08, 0.42), []);
  const podGeo = useMemo(() => new RoundedBoxGeometry(0.34, 0.22, 0.62, 3, 0.05), []);
  const segGeo = useMemo(() => new THREE.BoxGeometry(0.06, 0.32, 0.12), []);
  const ledGeo = useMemo(() => new THREE.BoxGeometry(0.08, 0.03, 0.02), []);
  const innerMat = useMemo(() => glow(COLORS.cyan, 2), []);
  const shieldMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLORS.amber.clone().multiplyScalar(1.6),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useDispose(frame, podGeo, segGeo, ledGeo, innerMat, shieldMat);

  // Segmented ring of "inspection" blades that spins faster as traffic passes.
  const segments = useInstances(28, segGeo, trim, (i, o) => {
    const a = (i / 28) * Math.PI * 2;
    o.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0);
    o.rotation.z = a;
  });
  // Sensor pods at each vertex, each with a status LED.
  const pods = useInstances(6, podGeo, panel, (i, o) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    o.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0);
    o.rotation.z = a;
  });
  const podLeds = useInstances(
    6,
    ledGeo,
    useMaterials().led,
    (i, o) => {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      o.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0.32);
      o.rotation.z = a;
    },
    true,
  );

  const spinner = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const { pulse } = heroStore;
    setGlow(innerMat, COLORS.cyan, 1.6 + pulse.gateway * 3);
    shieldMat.opacity = Math.min(0.9, pulse.gatewayReject * 1.1);
    if (spinner.current) spinner.current.rotation.z += dt * (0.25 + pulse.gateway * 1.5);
    const t = state.clock.elapsedTime;
    for (let i = 0; i < 6; i++) {
      tmpColor.copy(pulse.gatewayReject > 0.2 && i % 2 === 0 ? COLORS.amber : COLORS.cyan).multiplyScalar(1.2 + pulse.gateway * 2 + Math.sin(t * 2 + i) * 0.3);
      podLeds.setColorAt(i, tmpColor);
    }
    if (podLeds.instanceColor) podLeds.instanceColor.needsUpdate = true;
  });

  // Pylon from the bottom flat of the hexagon down to the floor.
  const local = FLOOR_Y - NODES.gateway.y;
  const hexBottom = -2.45 * Math.cos(Math.PI / 6);
  const pylon = hexBottom - local;

  return (
    <group position={NODES.gateway}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={frame} material={chassis} />
        <primitive object={pods} />
        <primitive object={podLeds} />
        <group ref={spinner}>
          <primitive object={segments} />
        </group>
        <mesh material={innerMat}>
          <torusGeometry args={[1.7, 0.02, 12, 180]} />
        </mesh>
        {/* Flashes amber when the rate limiter turns a request away. */}
        <mesh material={shieldMat}>
          <ringGeometry args={[1.45, 1.68, 96]} />
        </mesh>
      </group>
      <mesh material={trim} position={[0, hexBottom - pylon / 2, 0]}>
        <cylinderGeometry args={[0.28, 0.5, pylon, 32]} />
      </mesh>
      <mesh material={panel} position={[0, local + 0.05, 0]}>
        <cylinderGeometry args={[1.1, 1.2, 0.1, 48]} />
      </mesh>
    </group>
  );
}

// ---- .NET services: 2U rack servers ----------------------------------------------------------------

const BAYS = 6;
const VENTS = 14;

function Service({ index }: { index: number }) {
  const { chassis, trim, panel, led } = useMaterials();
  const body = useMemo(() => new RoundedBoxGeometry(1.9, 0.95, 1.5, 5, 0.12), []);
  const bayGeo = useMemo(() => new RoundedBoxGeometry(0.2, 0.5, 0.05, 2, 0.02), []);
  const ledGeo = useMemo(() => new THREE.BoxGeometry(0.1, 0.025, 0.01), []);
  const ventGeo = useMemo(() => new THREE.BoxGeometry(0.035, 0.012, 0.9), []);
  const handleGeo = useMemo(() => new RoundedBoxGeometry(0.07, 0.62, 0.08, 2, 0.03), []);
  const stripMat = useMemo(() => glow(COLORS.cyan, 2), []);
  useDispose(body, bayGeo, ledGeo, ventGeo, handleGeo, stripMat);

  const bays = useInstances(BAYS, bayGeo, panel, (i, o) => o.position.set(-0.62 + i * 0.235, -0.04, 0.765));
  const leds = useInstances(BAYS, ledGeo, led, (i, o) => o.position.set(-0.62 + i * 0.235, -0.33, 0.78), true);
  const vents = useInstances(VENTS, ventGeo, panel, (i, o) => o.position.set(-0.68 + i * 0.105, 0.477, -0.05));

  useFrame((state) => {
    const k = heroStore.pulse.services[index];
    setGlow(stripMat, COLORS.cyan, 1.2 + k * 3.5);
    flickerLeds(leds, COLORS.cyan, k, state.clock.elapsedTime, index * 17);
  });

  return (
    <group position={NODES.services[index]}>
      <mesh geometry={body} material={chassis} />
      {/* Front bezel insert */}
      <mesh material={panel} position={[0, -0.02, 0.752]}>
        <boxGeometry args={[1.56, 0.78, 0.01]} />
      </mesh>
      <primitive object={bays} />
      <primitive object={leds} />
      <primitive object={vents} />
      <mesh geometry={handleGeo} material={trim} position={[-0.89, 0, 0.77]} />
      <mesh geometry={handleGeo} material={trim} position={[0.89, 0, 0.77]} />
      {/* Status strip: pulses when the hero request is handled here. */}
      <mesh material={stripMat} position={[0, 0.36, 0.765]}>
        <boxGeometry args={[1.42, 0.035, 0.01]} />
      </mesh>
    </group>
  );
}

// ---- Redis -------------------------------------------------------------------------------------------

const KEY_SLOTS = 16;

function Cache() {
  const { glass, trim, led } = useMaterials();
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.05)), []);
  const edgeMat = useMemo(() => line(COLORS.cyan, 0.75), []);
  const coreMat = useMemo(() => glow(COLORS.response, 2), []);
  const slotGeo = useMemo(() => new THREE.BoxGeometry(0.08, 0.05, 0.05), []);
  // Ripple that rings out when a response is written into the cache.
  const rippleMat = useMemo(() => {
    const m = glow(COLORS.heroResponse, 2.2);
    m.transparent = true;
    m.opacity = 0;
    return m;
  }, []);
  useDispose(edges, edgeMat, coreMat, slotGeo, rippleMat);

  // A machined collar of key slots around the crystal; they light up as a value is stored.
  const slots = useInstances(
    KEY_SLOTS,
    slotGeo,
    led,
    (i, o) => {
      const a = (i / KEY_SLOTS) * Math.PI * 2;
      o.position.set(Math.cos(a) * 1.32, 0, Math.sin(a) * 1.32);
      o.rotation.y = -a;
    },
    true,
  );

  const group = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const k = heroStore.pulse.cache;
    const t = state.clock.elapsedTime;
    setGlow(coreMat, COLORS.response, 1.4 + k * 4);
    if (ripple.current) {
      ripple.current.scale.setScalar(1.1 + (1 - k) * 0.7);
      rippleMat.opacity = k > 0.05 ? k * 0.6 : 0;
    }
    if (crystal.current) crystal.current.rotation.y += dt * 0.4;
    if (group.current) group.current.position.y = NODES.cache.y + Math.sin(t * 0.8) * 0.12;
    // Slots fill one after another while a value is being written.
    for (let i = 0; i < KEY_SLOTS; i++) {
      const lit = k > 0.05 ? (i / KEY_SLOTS < k ? 2.6 : 0.4) : 0.35 + 0.25 * Math.sin(t * 1.5 + i * 0.7);
      slots.setColorAt(i, tmpColor.copy(k > 0.05 ? COLORS.heroResponse : COLORS.cyan).multiplyScalar(lit));
    }
    if (slots.instanceColor) slots.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={group} position={NODES.cache}>
      <group ref={crystal}>
        <mesh material={glass}>
          <octahedronGeometry args={[1.05]} />
        </mesh>
        <lineSegments geometry={edges} material={edgeMat} />
      </group>
      <mesh material={coreMat}>
        <icosahedronGeometry args={[0.28, 1]} />
      </mesh>
      <mesh material={trim} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.045, 16, 128]} />
      </mesh>
      <primitive object={slots} />
      <mesh ref={ripple} material={rippleMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.012, 8, 120]} />
      </mesh>
    </group>
  );
}

// ---- message queue: a conveyor of messages ---------------------------------------------------------

const SLOTS = 6;
const ROLLERS = 14;

function Queue() {
  const { chassis, trim, panel } = useMaterials();
  const bed = useMemo(() => new RoundedBoxGeometry(3.3, 0.14, 0.95, 4, 0.05), []);
  const capsule = useMemo(() => new RoundedBoxGeometry(0.34, 0.26, 0.52, 4, 0.08), []);
  const rollerGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.045, 0.045, 0.84, 16);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const slotMats = useMemo(() => Array.from({ length: SLOTS }, () => glow(COLORS.violet, 0.15)), []);
  useDispose(bed, capsule, rollerGeo, ...slotMats);

  const rollers = useInstances(ROLLERS, rollerGeo, trim, (i, o) => o.position.set(-1.5 + i * (3 / (ROLLERS - 1)), -0.2, 0));

  useFrame(() => {
    const depth = Math.min(SLOTS, heroStore.stats.queueDepth);
    slotMats.forEach((m, i) => setGlow(m, COLORS.violet, i < depth ? 2.2 + heroStore.pulse.queue : 0.12));
  });

  return (
    <group position={NODES.queue}>
      <mesh geometry={bed} material={chassis} position={[0, -0.32, 0]} />
      <primitive object={rollers} />
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} material={trim} position={[0, -0.16, z]}>
          <boxGeometry args={[3.3, 0.07, 0.05]} />
        </mesh>
      ))}
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} material={panel} position={[x, -0.2, 0]}>
          <boxGeometry args={[0.1, 0.34, 1.05]} />
        </mesh>
      ))}
      {slotMats.map((m, i) => (
        <mesh key={i} geometry={capsule} material={m} position={[-1.12 + i * 0.45, 0, 0]} />
      ))}
    </group>
  );
}

// ---- background workers: interlocking gears ------------------------------------------------------------

function gearGeometry(teeth: number, outer: number, root: number, hole: number) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [a, root],
      [a + step * 0.12, outer],
      [a + step * 0.48, outer],
      [a + step * 0.6, root],
    ];
    pts.forEach(([ang, r], j) => {
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  shape.holes.push(h);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2, curveSegments: 24 });
  g.translate(0, 0, -0.08);
  return g;
}

function Worker() {
  const { trim } = useMaterials();
  const big = useMemo(() => gearGeometry(14, 0.62, 0.5, 0.16), []);
  const small = useMemo(() => gearGeometry(10, 0.46, 0.35, 0.12), []);
  const coreMat = useMemo(() => glow(COLORS.violet, 2), []);
  useDispose(big, small, coreMat);
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const k = heroStore.pulse.worker;
    setGlow(coreMat, COLORS.violet, 1.4 + k * 3);
    const speed = 0.6 + k * 4;
    if (a.current) a.current.rotation.z += dt * speed;
    // Meshed gears turn the other way, faster in proportion to their size.
    if (b.current) b.current.rotation.z -= dt * speed * (14 / 10);
  });
  return (
    <group position={NODES.worker}>
      <mesh ref={a} geometry={big} material={trim} position={[-0.5, 0, 0]} />
      <mesh ref={b} geometry={small} material={trim} position={[0.53, 0.18, 0]} />
      <mesh material={coreMat} position={[-0.5, 0, 0.1]}>
        <sphereGeometry args={[0.13, 24, 24]} />
      </mesh>
      <mesh material={coreMat} position={[0.53, 0.18, 0.1]}>
        <sphereGeometry args={[0.1, 24, 24]} />
      </mesh>
    </group>
  );
}

// ---- PostgreSQL: a storage array ----------------------------------------------------------------------

const DISK_LEDS = 28;
const PLATTERS = [-0.68, 0, 0.68];

function Database() {
  const { chassis, trim, panel, led } = useMaterials();
  // A bevelled platter, turned on a lathe.
  const platter = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, -0.26),
          new THREE.Vector2(1.36, -0.26),
          new THREE.Vector2(1.45, -0.19),
          new THREE.Vector2(1.45, 0.19),
          new THREE.Vector2(1.36, 0.26),
          new THREE.Vector2(0, 0.26),
        ],
        112,
      ),
    [],
  );
  const groove = useMemo(() => new THREE.TorusGeometry(1, 0.006, 6, 128), []);
  const ledGeo = useMemo(() => new THREE.BoxGeometry(0.06, 0.03, 0.02), []);
  const rimMat = useMemo(() => glow(COLORS.cyan, 2), []);
  const spindleMat = useMemo(() => glow(COLORS.cyan, 1.2), []);
  useDispose(platter, groove, ledGeo, rimMat, spindleMat);

  const ledSets = [
    useInstances(DISK_LEDS, ledGeo, led, (i, o) => placeRimLed(i, o), true),
    useInstances(DISK_LEDS, ledGeo, led, (i, o) => placeRimLed(i, o), true),
    useInstances(DISK_LEDS, ledGeo, led, (i, o) => placeRimLed(i, o), true),
  ];

  useFrame((state) => {
    const k = heroStore.pulse.db;
    setGlow(rimMat, COLORS.cyan, 1.3 + k * 3.5);
    setGlow(spindleMat, COLORS.cyan, 0.9 + k * 2.5);
    ledSets.forEach((set, i) => flickerLeds(set, COLORS.cyan, k, state.clock.elapsedTime, i * 31));
  });

  return (
    <group position={NODES.db}>
      <mesh material={spindleMat}>
        <cylinderGeometry args={[0.1, 0.1, 2.3, 24]} />
      </mesh>
      {PLATTERS.map((y, i) => (
        <group key={y} position={[0, y, 0]}>
          <mesh geometry={platter} material={chassis} />
          {/* Machined grooves on the top face. */}
          {[0.55, 0.85, 1.15].map((r) => (
            <mesh key={r} geometry={groove} material={trim} position={[0, 0.262, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[r, r, 1]} />
          ))}
          <mesh material={rimMat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.455, 0.016, 10, 180]} />
          </mesh>
          <primitive object={ledSets[i]} />
        </group>
      ))}
      <mesh material={panel} position={[0, -1.06, 0]}>
        <cylinderGeometry args={[1.62, 1.7, 0.14, 96]} />
      </mesh>
    </group>
  );
}

function placeRimLed(i: number, o: THREE.Object3D) {
  const a = (i / DISK_LEDS) * Math.PI * 2;
  o.position.set(Math.cos(a) * 1.462, -0.11, Math.sin(a) * 1.462);
  o.rotation.y = -a + Math.PI / 2;
}

export function Nodes() {
  return (
    <>
      <Clients />
      <Gateway />
      <Service index={0} />
      <Service index={1} />
      <Service index={2} />
      <Cache />
      <Queue />
      <Worker />
      <Database />
    </>
  );
}
