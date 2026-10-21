"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useTheme } from "@/lib/useTheme";
import { heroStore } from "../heroStore";
import { OVERVIEW } from "../stages";
import { HeroPacket } from "./HeroPacket";
import { sampleJourney } from "./journey";
import { Nodes } from "./Nodes";
import { Packets } from "./Packets";
import { ALL_LANES, COLORS, FLOOR_Y, NODES, type NodeKey } from "./topology";

export type SceneProps = {
  mobile: boolean;
  active: boolean;
  labelRefs: RefObject<Partial<Record<NodeKey, HTMLDivElement | null>>>;
  /** Tag riding on the hero request. */
  tagRef: RefObject<HTMLDivElement | null>;
};

/**
 * Native sharpness: the screen's own pixel density, capped at 2× and at a 4K-sized pixel budget, so Retina and
 * 4K displays get crisp output without huge 5K-class canvases. AdaptiveDpr still steps down if frames drop.
 */
function nativeDpr(mobile: boolean) {
  const device = window.devicePixelRatio || 1;
  const budget = (mobile ? 2_000_000 : 3840 * 2160) / (window.innerWidth * window.innerHeight);
  return Math.max(1, Math.min(device, 2, Math.sqrt(budget)));
}

export default function Scene({ mobile, active, labelRefs, tagRef }: SceneProps) {
  const maxDpr = useMemo(() => nativeDpr(mobile), [mobile]);
  const { background, accent } = useTheme().tokens;
  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={active ? "always" : "never"}
      dpr={[1, maxDpr]}
      camera={{ fov: mobile ? 52 : 38, near: 0.1, far: 120, position: [...OVERVIEW.start.position] }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(background);
        scene.fog = new THREE.FogExp2(background, mobile ? 0.026 : 0.03);
      }}
    >
      <ThemeSync background={background} accent={accent} />
      <Environment />
      <ambientLight intensity={0.15} />
      <directionalLight position={[6, 12, 8]} intensity={0.9} />
      <pointLight position={[-8.5, 3, 3]} color={accent} intensity={18} distance={14} />
      <pointLight position={[6, -1, 4]} color={COLORS.violet} intensity={14} distance={12} />
      <pointLight position={[11, 4, 3]} color={accent} intensity={14} distance={12} />

      <Links accent={accent} />
      <Nodes />
      <Packets max={mobile ? 180 : 440} rate={mobile ? 15 : 34} />
      <HeroPacket />
      <Floor accent={accent} />
      <Dust count={mobile ? 220 : 650} accent={accent} />

      <CameraRig mobile={mobile} />
      <LabelProjector labelRefs={labelRefs} tagRef={tagRef} />
      <AdaptiveDpr max={maxDpr} />

      {/* At high pixel density 2× MSAA is enough; 4× only pays off at 1×. */}
      <EffectComposer multisampling={mobile ? 0 : maxDpr >= 1.75 ? 2 : 4}>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.78} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.28} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  );
}

/**
 * Follows the visitor's theme: stage background and fog track the page background, and the shared accent
 * colours (read by packets as they spawn) track the highlight colour.
 */
function ThemeSync({ background, accent }: { background: string; accent: string }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.setClearColor(background);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.set(background);
  }, [gl, scene, background]);
  useEffect(() => {
    COLORS.cyan.set(accent);
    COLORS.heroRequest.set(accent).lerp(WHITE, 0.35);
  }, [accent]);
  return null;
}

const WHITE = new THREE.Color("#ffffff");

/** Studio reflections for the metal, generated procedurally (no HDR download). */
function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.65;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Links({ accent }: { accent: string }) {
  const tubes = useMemo(
    () =>
      ALL_LANES.map(({ lane, kind }) => {
        const geometry = new THREE.TubeGeometry(lane.curve, 80, kind === "edge" ? 0.008 : 0.012, 6, false);
        const color = kind === "async" ? COLORS.violet : COLORS.cyan;
        const material = new THREE.MeshBasicMaterial({
          color: color.clone().multiplyScalar(kind === "edge" ? 0.5 : 0.8),
          transparent: true,
          opacity: kind === "edge" ? 0.35 : 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        return { geometry, material, kind };
      }),
    [],
  );
  useEffect(() => {
    const color = new THREE.Color(accent);
    for (const { material, kind } of tubes) {
      if (kind !== "async") material.color.copy(color).multiplyScalar(kind === "edge" ? 0.5 : 0.8);
    }
  }, [tubes, accent]);
  useEffect(
    () => () =>
      tubes.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      }),
    [tubes],
  );
  return (
    <>
      {tubes.map(({ geometry, material }, i) => (
        <mesh key={i} geometry={geometry} material={material} />
      ))}
    </>
  );
}

const FLOOR_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FLOOR_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vWorld;
  float gridLine(vec2 p, float size) {
    vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    vec2 p = vWorld.xz;
    float minor = gridLine(p, 1.0) * 0.28;
    float major = gridLine(p, 5.0);
    float d = length(p - vec2(-1.5, 0.0));
    float fade = 1.0 - smoothstep(5.0, 28.0, d);
    // A slow scan line sweeping along the system, left to right.
    float scan = exp(-pow(mod(p.x - uTime * 3.0, 40.0) - 20.0, 2.0) * 0.08) * 0.6;
    float a = (max(minor, major * 0.75) + scan * major) * fade;
    gl_FragColor = vec4(uColor * (0.7 + major * 0.6 + scan), a * 0.55);
  }
`;

function Floor({ accent }: { accent: string }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLOOR_VERTEX,
        fragmentShader: FLOOR_FRAGMENT,
        uniforms: { uColor: { value: COLORS.cyan.clone().multiplyScalar(0.55) }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    (material.uniforms.uColor.value as THREE.Color).set(accent).multiplyScalar(0.55);
  }, [material, accent]);
  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });
  return (
    <mesh material={material} position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[90, 90]} />
    </mesh>
  );
}

function Dust({ count, accent }: { count: number; accent: string }) {
  const ref = useRef<THREE.Points>(null);
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = FLOOR_Y + Math.random() * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const m = new THREE.PointsMaterial({
      size: 0.09,
      map: new THREE.CanvasTexture(canvas),
      color: COLORS.cyan.clone().multiplyScalar(0.9),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry: g, material: m };
  }, [count]);
  useEffect(() => () => {
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
  }, [geometry, material]);
  useEffect(() => {
    material.color.set(accent).multiplyScalar(0.9);
  }, [material, accent]);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.01;
    ref.current.position.y = Math.sin(t * 0.2) * 0.25;
  });
  return <points ref={ref} geometry={geometry} material={material} />;
}

/** Camera: blends a wide overview with a tracking shot locked onto the hero request. GSAP drives the inputs. */
function CameraRig({ mobile }: { mobile: boolean }) {
  const tmp = useMemo(
    () => ({
      packet: new THREE.Vector3(),
      followPos: new THREE.Vector3(),
      followLook: new THREE.Vector3(),
      overviewPos: new THREE.Vector3(),
      overviewLook: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      current: new THREE.Vector3(...OVERVIEW.start.target),
      startPos: new THREE.Vector3(...OVERVIEW.start.position),
      endPos: new THREE.Vector3(...OVERVIEW.end.position),
      startLook: new THREE.Vector3(...OVERVIEW.start.target),
      endLook: new THREE.Vector3(...OVERVIEW.end.target),
    }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const { journey, follow, overview, offset } = heroStore;
    const portrait = mobile || state.size.width < state.size.height;

    sampleJourney(journey, tmp.packet);
    tmp.followLook.copy(tmp.packet);
    tmp.followPos.set(offset.x, offset.y, offset.z).multiplyScalar(portrait ? 1.6 : 1).add(tmp.packet);

    tmp.overviewPos.lerpVectors(tmp.startPos, tmp.endPos, overview);
    tmp.overviewLook.lerpVectors(tmp.startLook, tmp.endLook, overview);
    // Portrait: the whole system is wide, so the establishing shots pull back much further than the tracking shots.
    if (portrait) tmp.overviewPos.sub(tmp.overviewLook).multiplyScalar(2.1).add(tmp.overviewLook);

    // Fog tuned for close-ups would swallow the distant portrait overview, so thin it out there.
    if (state.scene.fog instanceof THREE.FogExp2) {
      state.scene.fog.density = portrait ? 0.011 + (0.026 - 0.011) * follow : 0.03;
    }

    tmp.pos.lerpVectors(tmp.overviewPos, tmp.followPos, follow);
    tmp.look.lerpVectors(tmp.overviewLook, tmp.followLook, follow);
    tmp.pos.x += state.pointer.x * 0.45;
    tmp.pos.y += state.pointer.y * 0.25;

    // GSAP scrub + Lenis already smooth the inputs; this only removes residual jitter.
    // Softer follow: the camera glides between shots instead of tracking every wheel tick.
    const damp = 1 - Math.exp(-dt * 6);
    state.camera.position.lerp(tmp.pos, damp);
    tmp.current.lerp(tmp.look, damp);
    state.camera.lookAt(tmp.current);
  });
  return null;
}

const LABEL_ANCHORS: Record<NodeKey, THREE.Vector3> = {
  clients: NODES.clients.clone().add(new THREE.Vector3(0, 2.3, 0)),
  gateway: NODES.gateway.clone().add(new THREE.Vector3(0, 2.8, 0)),
  services: NODES.services[0].clone().add(new THREE.Vector3(0, 1, 0)),
  cache: NODES.cache.clone().add(new THREE.Vector3(0, 1.5, 0)),
  queue: NODES.queue.clone().add(new THREE.Vector3(0, -0.85, 0)),
  worker: NODES.worker.clone().add(new THREE.Vector3(0, -0.95, 0)),
  db: NODES.db.clone().add(new THREE.Vector3(0, 1.5, 0)),
};

/** Projects anchors to screen space and positions DOM labels (crisp text, no 3D fonts). */
function LabelProjector({ labelRefs, tagRef }: Pick<SceneProps, "labelRefs" | "tagRef">) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const packet = useMemo(() => new THREE.Vector3(), []);
  const lifted = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const { follow, journey } = heroStore;
    sampleJourney(journey, packet);
    const place = (el: HTMLElement, world: THREE.Vector3) => {
      v.copy(world).project(camera);
      el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px, 0) translate(-50%, -100%)`;
      return v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    };
    for (const key of Object.keys(LABEL_ANCHORS) as NodeKey[]) {
      const el = labelRefs.current?.[key];
      if (!el) continue;
      const visible = place(el, LABEL_ANCHORS[key]);
      const node = key === "services" ? NODES.services[1] : (NODES[key] as THREE.Vector3);
      // While tracking, highlight the component the request is passing through.
      // In the distant portrait overview labels would overlap, so they only appear while tracking.
      const portrait = size.width < size.height;
      const focus = follow < 0.5 ? (portrait ? 0 : 0.85) : node.distanceTo(packet) < 4.5 ? 1 : 0.3;
      el.style.opacity = visible ? String(focus) : "0";
    }
    const tag = tagRef.current;
    if (tag) {
      const visible = place(tag, lifted.copy(packet).add(TAG_LIFT));
      tag.style.opacity = visible ? String(Math.max(0, (follow - 0.4) / 0.6)) : "0";
    }
  });
  return null;
}

const TAG_LIFT = new THREE.Vector3(0, 0.55, 0);

/**
 * Steps the pixel ratio down when frames drop and back up when there is headroom. Ignores the first seconds
 * (shader compilation, first uploads) and needs two slow windows in a row, so a single hitch never costs sharpness.
 */
function AdaptiveDpr({ max }: { max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ time: 0, frames: 0, dpr: max, warmup: 2.5, slow: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    if (a.warmup > 0) {
      a.warmup -= dt;
      return;
    }
    a.time += dt;
    a.frames++;
    if (a.time < 1.5) return;
    const fps = a.frames / a.time;
    a.time = a.frames = 0;
    a.slow = fps < 45 ? a.slow + 1 : 0;
    let next = a.dpr;
    if (a.slow >= 2 && a.dpr > 0.75) {
      next = Math.max(0.75, a.dpr - 0.25);
      a.slow = 0;
    } else if (fps > 57 && a.dpr < max) {
      next = Math.min(max, a.dpr + 0.25);
    }
    if (next !== a.dpr) {
      a.dpr = next;
      setDpr(next);
    }
  });
  return null;
}
