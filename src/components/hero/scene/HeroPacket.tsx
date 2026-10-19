"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heroStore } from "../heroStore";
import { JOURNEY_AT, RESPONSE_FROM, sampleJourney } from "./journey";
import { COLORS } from "./topology";

const TRAIL = 36;
const TRAIL_SPACING = 0.0022;

function radialTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** The one request the camera follows: a bright core, a fading trail, a halo and a light that grazes each node. */
export function HeroPacket() {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);
  const trail = useRef<THREE.InstancedMesh>(null);

  const res = useMemo(() => {
    const coreGeo = new THREE.CapsuleGeometry(0.085, 0.38, 6, 16);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const trailGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const trailMat = new THREE.MeshBasicMaterial({
      toneMapped: false,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloMat = new THREE.SpriteMaterial({
      map: radialTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return { coreGeo, coreMat, trailGeo, trailMat, haloMat };
  }, []);
  useEffect(() => () => {
    res.coreGeo.dispose();
    res.coreMat.dispose();
    res.trailGeo.dispose();
    res.trailMat.dispose();
    res.haloMat.map?.dispose();
    res.haloMat.dispose();
  }, [res]);

  const tmp = useMemo(
    () => ({ pos: new THREE.Vector3(), ahead: new THREE.Vector3(), dummy: new THREE.Object3D(), color: new THREE.Color() }),
    [],
  );

  useFrame((state) => {
    const u = heroStore.journey;
    const response = u >= RESPONSE_FROM;
    const base = response ? COLORS.heroResponse : COLORS.heroRequest;
    const t = state.clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 9) * 0.06;

    sampleJourney(u, tmp.pos);
    sampleJourney(Math.min(1, u + 0.003), tmp.ahead);
    if (core.current) {
      core.current.position.copy(tmp.pos);
      if (tmp.ahead.distanceToSquared(tmp.pos) > 1e-10) core.current.lookAt(tmp.ahead);
      res.coreMat.color.copy(base).multiplyScalar(3.4 * flicker);
    }
    if (halo.current) {
      halo.current.position.copy(tmp.pos);
      halo.current.scale.setScalar(1.25 * flicker);
      res.haloMat.color.copy(base).multiplyScalar(1.3);
    }
    if (light.current) {
      light.current.position.copy(tmp.pos);
      light.current.color.copy(base);
    }

    // Trail: samples of the journey just behind the packet, shrinking and dimming.
    const mesh = trail.current;
    if (mesh) {
      let n = 0;
      for (let i = 1; i <= TRAIL; i++) {
        const tu = u - i * TRAIL_SPACING;
        if (tu <= 0) break;
        sampleJourney(tu, tmp.pos);
        const k = 1 - i / (TRAIL + 1);
        tmp.dummy.position.copy(tmp.pos);
        tmp.dummy.scale.setScalar(k * 1.1);
        tmp.dummy.updateMatrix();
        mesh.setMatrixAt(n, tmp.dummy.matrix);
        tmp.color.copy(tu >= RESPONSE_FROM ? COLORS.heroResponse : COLORS.heroRequest).multiplyScalar(2.2 * k * k);
        mesh.setColorAt(n, tmp.color);
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Nodes light up as the request passes through them.
    const near = (at: number) => Math.max(0, 1 - Math.abs(u - at) / 0.012);
    const { pulse } = heroStore;
    pulse.gateway = Math.max(pulse.gateway, near(JOURNEY_AT.gateway), near(JOURNEY_AT.gatewayBack));
    pulse.services[1] = Math.max(
      pulse.services[1],
      near(JOURNEY_AT.service),
      near(JOURNEY_AT.serviceBack),
      near(JOURNEY_AT.serviceAfterCache),
    );
    pulse.db = Math.max(pulse.db, near(JOURNEY_AT.db));
    // The response being written into Redis: the cache flares harder than a passing request.
    pulse.cache = Math.max(pulse.cache, Math.min(1, near(JOURNEY_AT.cache) * 1.4));
  });

  return (
    <>
      <mesh ref={core} geometry={res.coreGeo} material={res.coreMat} />
      <sprite ref={halo} material={res.haloMat} />
      <pointLight ref={light} intensity={9} distance={6} decay={1.6} />
      <instancedMesh ref={trail} args={[res.trailGeo, res.trailMat, TRAIL]} frustumCulled={false} />
    </>
  );
}
