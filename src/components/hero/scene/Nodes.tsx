"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { heroStore } from "../heroStore";
import { COLORS, NODES } from "./topology";

/** Shared materials: one dark clear-coated metal plus emissive accents that bloom. */
function useMaterials() {
  const m = useMemo(() => {
    const metal = new THREE.MeshPhysicalMaterial({
      color: "#0d1219",
      metalness: 0.9,
      roughness: 0.28,
      clearcoat: 0.8,
      clearcoatRoughness: 0.18,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#0a1a24",
      metalness: 0.2,
      roughness: 0.08,
      transparent: true,
      opacity: 0.55,
      clearcoat: 1,
    });
    const glow = (color: THREE.Color, k: number) =>
      new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(k), toneMapped: false });
    const line = (color: THREE.Color, opacity: number) =>
      new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false });
    return { metal, glass, glow, line };
  }, []);
  useEffect(() => () => {
    m.metal.dispose();
    m.glass.dispose();
  }, [m]);
  return m;
}

/** Sets an emissive material's brightness from a 0–1 pulse. */
function setGlow(material: THREE.MeshBasicMaterial | THREE.LineBasicMaterial, base: THREE.Color, k: number) {
  material.color.copy(base).multiplyScalar(k);
}

function Clients() {
  const { metal, line, glow } = useMaterials();
  const group = useRef<THREE.Group>(null);
  const wire = useMemo(() => new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.5, 2)), []);
  const wireMat = useMemo(() => line(COLORS.cyan, 0.32), [line]);
  const ringMat = useMemo(() => glow(COLORS.cyan, 1.6), [glow]);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.12;
  });
  return (
    <group position={NODES.clients}>
      <group ref={group}>
        <mesh material={metal}>
          <sphereGeometry args={[1.28, 48, 48]} />
        </mesh>
        <lineSegments geometry={wire} material={wireMat} />
      </group>
      <mesh material={ringMat} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <torusGeometry args={[2.05, 0.012, 8, 160]} />
      </mesh>
      <mesh material={ringMat} rotation={[Math.PI / 1.7, -0.5, 0]}>
        <torusGeometry args={[2.35, 0.008, 8, 160]} />
      </mesh>
    </group>
  );
}

function Gateway() {
  const { metal, glow, line } = useMaterials();
  const innerMat = useMemo(() => glow(COLORS.cyan, 2), [glow]);
  const frameMat = useMemo(() => line(COLORS.cyan, 0.35), [line]);
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
  const frame = useMemo(() => {
    const g = new THREE.EdgesGeometry(new THREE.CylinderGeometry(2.45, 2.45, 0.7, 6));
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const { pulse } = heroStore;
    setGlow(innerMat, COLORS.cyan, 1.6 + pulse.gateway * 3);
    shieldMat.opacity = Math.min(0.9, pulse.gatewayReject * 1.1);
    frameMat.color.copy(COLORS.cyan).lerp(COLORS.amber, Math.min(1, pulse.gatewayReject * 1.5));
    if (ring.current) ring.current.rotation.z += dt * (0.25 + pulse.gateway);
  });
  return (
    <group position={NODES.gateway} rotation={[0, Math.PI / 2, 0]}>
      <mesh ref={ring} material={metal}>
        <torusGeometry args={[1.95, 0.1, 32, 128]} />
      </mesh>
      <mesh material={innerMat}>
        <torusGeometry args={[1.76, 0.02, 12, 160]} />
      </mesh>
      <lineSegments geometry={frame} material={frameMat} />
      {/* Flashes amber when the rate limiter turns a request away. */}
      <mesh material={shieldMat}>
        <ringGeometry args={[1.5, 1.74, 96]} />
      </mesh>
    </group>
  );
}

function Service({ index }: { index: number }) {
  const { metal, glow, line } = useMaterials();
  const body = useMemo(() => new RoundedBoxGeometry(1.9, 0.95, 1.5, 5, 0.16), []);
  const outline = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(2.04, 1.08, 1.64)), []);
  const stripMat = useMemo(() => glow(COLORS.cyan, 2), [glow]);
  const outlineMat = useMemo(() => line(COLORS.cyan, 0.14), [line]);
  useFrame(() => {
    const k = heroStore.pulse.services[index];
    setGlow(stripMat, COLORS.cyan, 1.2 + k * 3.5);
    outlineMat.opacity = 0.12 + k * 0.35;
  });
  return (
    <group position={NODES.services[index]}>
      <mesh geometry={body} material={metal} />
      <lineSegments geometry={outline} material={outlineMat} />
      <mesh material={stripMat} position={[0, 0.18, 0.76]}>
        <boxGeometry args={[1.4, 0.05, 0.01]} />
      </mesh>
      {[-0.55, -0.4, -0.25].map((x) => (
        <mesh key={x} material={stripMat} position={[x, -0.18, 0.76]}>
          <circleGeometry args={[0.035, 16]} />
        </mesh>
      ))}
    </group>
  );
}

function Cache() {
  const { glass, glow, line } = useMaterials();
  const group = useRef<THREE.Group>(null);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.05)), []);
  const edgeMat = useMemo(() => line(COLORS.cyan, 0.75), [line]);
  const coreMat = useMemo(() => glow(COLORS.response, 2), [glow]);
  const orbitMat = useMemo(() => glow(COLORS.cyan, 1.4), [glow]);
  // Ripple that rings out when a response is written into the cache.
  const rippleMat = useMemo(() => {
    const m = glow(COLORS.heroResponse, 2.2);
    m.transparent = true;
    m.opacity = 0;
    return m;
  }, [glow]);
  const ripple = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const k = heroStore.pulse.cache;
    setGlow(coreMat, COLORS.response, 1.4 + k * 4);
    if (ripple.current) {
      ripple.current.scale.setScalar(1.1 + (1 - k) * 0.7);
      rippleMat.opacity = k > 0.05 ? k * 0.6 : 0;
    }
    if (group.current) {
      group.current.rotation.y += dt * 0.4;
      group.current.position.y = NODES.cache.y + Math.sin(state.clock.elapsedTime * 0.8) * 0.12;
    }
  });
  return (
    <group ref={group} position={NODES.cache}>
      <mesh material={glass}>
        <octahedronGeometry args={[1.05]} />
      </mesh>
      <lineSegments geometry={edges} material={edgeMat} />
      <mesh material={coreMat}>
        <icosahedronGeometry args={[0.28, 1]} />
      </mesh>
      <mesh material={orbitMat} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.55, 0.01, 8, 160]} />
      </mesh>
      <mesh ref={ripple} material={rippleMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.012, 8, 120]} />
      </mesh>
    </group>
  );
}

const SLOTS = 6;

function Queue() {
  const { metal, glow } = useMaterials();
  const slab = useMemo(() => new RoundedBoxGeometry(3, 0.3, 1, 4, 0.1), []);
  const slotMats = useMemo(() => Array.from({ length: SLOTS }, () => glow(COLORS.violet, 0.15)), [glow]);
  useFrame(() => {
    const depth = Math.min(SLOTS, heroStore.stats.queueDepth);
    slotMats.forEach((m, i) => setGlow(m, COLORS.violet, i < depth ? 2.2 + heroStore.pulse.queue : 0.12));
  });
  return (
    <group position={NODES.queue}>
      <mesh geometry={slab} material={metal} position={[0, -0.3, 0]} />
      {slotMats.map((m, i) => (
        <mesh key={i} material={m} position={[-1.12 + i * 0.45, 0, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
        </mesh>
      ))}
    </group>
  );
}

function Worker() {
  const { metal, glow } = useMaterials();
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const coreMat = useMemo(() => glow(COLORS.violet, 2), [glow]);
  useFrame((_, dt) => {
    const k = heroStore.pulse.worker;
    setGlow(coreMat, COLORS.violet, 1.4 + k * 3);
    if (a.current) a.current.rotation.z += dt * (0.6 + k * 4);
    if (b.current) b.current.rotation.z -= dt * (0.6 + k * 4);
  });
  return (
    <group position={NODES.worker}>
      <mesh ref={a} material={metal} position={[-0.45, 0, 0]}>
        <torusGeometry args={[0.55, 0.12, 6, 6]} />
      </mesh>
      <mesh ref={b} material={metal} position={[0.55, 0.15, 0]}>
        <torusGeometry args={[0.42, 0.1, 6, 6]} />
      </mesh>
      <mesh material={coreMat} position={[-0.45, 0, 0]}>
        <sphereGeometry args={[0.14, 24, 24]} />
      </mesh>
      <mesh material={coreMat} position={[0.55, 0.15, 0]}>
        <sphereGeometry args={[0.1, 24, 24]} />
      </mesh>
    </group>
  );
}

function Database() {
  const { metal, glow } = useMaterials();
  const rimMat = useMemo(() => glow(COLORS.cyan, 2), [glow]);
  useFrame(() => setGlow(rimMat, COLORS.cyan, 1.3 + heroStore.pulse.db * 3.5));
  return (
    <group position={NODES.db}>
      {[-0.68, 0, 0.68].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh material={metal}>
            <cylinderGeometry args={[1.45, 1.45, 0.52, 96]} />
          </mesh>
          <mesh material={rimMat} position={[0, 0.27, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.45, 0.02, 10, 160]} />
          </mesh>
        </group>
      ))}
    </group>
  );
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
