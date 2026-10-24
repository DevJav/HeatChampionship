import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Sky } from "three/addons/objects/Sky.js";
import type { TrackGeometry } from "@/lib/race-log/layout";
import { besideLine } from "@/lib/race-log/track-path";
import { carFactory, loadCarModel, REAR_AXLE, REAR_TRACK, WHEELBASE, type CarRig } from "./car-model";
import { CAR_SCALE, carPose, type CameraPose, type Stage } from "./director";
import { DistanceBlurPass } from "./distance-blur";
import { buildPodium } from "./podium";
import { buildScenery } from "./scenery";
import { smoke } from "./textures";
import { outlineMaterial, toonify } from "./toon";

/**
 * The 3D scene of the replay: a physical sky that also lights the scene and
 * shows in the paint, a sun whose shadows follow the action, the circuit
 * (scenery.ts) and the cars (car-model.ts), which steer, pitch under braking,
 * roll in corners and light up their rain light when slowing. On "high"
 * quality it adds ambient occlusion and bloom. Loaded only on the 3D replay
 * page, so three.js stays out of every other bundle.
 */

export type WorldCar = { id: string; color: string };
export const TIMES_OF_DAY = ["day", "sunset", "night"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];
/** "high" for computers and recordings, "low" keeps phones smooth */
export type Quality = "high" | "low";

export type World = {
  canvas: HTMLCanvasElement;
  setSize(width: number, height: number, pixelRatio: number): void;
  render(t: number, camera: CameraPose): void;
  setTimeOfDay(time: TimeOfDay): void;
  dispose(): void;
};

/** Cel shading (flat bands of light, black outlines) rather than the realistic look */
const CEL_SHADED = true;

/** Exposure and lights per look: toon materials take no light from the sky, so they get more fill */
const LIGHTING = CEL_SHADED
  ? { exposure: 0.8, sun: 3.2, fill: 2.2, sky: 0 }
  : { exposure: 0.5, sun: 5.5, fill: 0.5, sky: 0.35 };

type Look = {
  /** At night the "sun" is the floodlights together: high, white and cool */
  sun: { elevation: number; azimuth: number; color: string; intensity: number };
  fill: { sky: string; ground: string; intensity: number };
  /** The physical sky, or a plain dark one with stars */
  sky: { turbidity: number; rayleigh: number; mie: number } | { night: string };
  fog: { color: string; near: number; far: number };
  exposure: number;
};

/** The light at each time of day, for the cel-shaded look (the realistic one scales them) */
const LOOKS: Record<TimeOfDay, Look> = {
  // Sun high enough for crisp shadows, low enough to model the cars
  day: {
    sun: { elevation: 38, azimuth: 215, color: "#fff1dc", intensity: 3.2 },
    fill: { sky: "#cfe3ff", ground: "#3d5a2a", intensity: 2.2 },
    sky: { turbidity: 3.5, rayleigh: 1.4, mie: 0.004 },
    fog: { color: "#c7d6e3", near: 0.9, far: 5 },
    exposure: 0.8,
  },
  // Low and golden, long shadows, a hazy orange sky
  sunset: {
    // Warm light, cool shadows
    sun: { elevation: 12, azimuth: 250, color: "#ffbd7a", intensity: 3.4 },
    fill: { sky: "#b9b6dc", ground: "#3a3128", intensity: 2.1 },
    sky: { turbidity: 12, rayleigh: 3.4, mie: 0.02 },
    fog: { color: "#eaa878", near: 0.6, far: 3.5 },
    exposure: 0.85,
  },
  night: {
    sun: { elevation: 64, azimuth: 180, color: "#dfe8ff", intensity: 1.9 },
    fill: { sky: "#3a4f86", ground: "#05080a", intensity: 0.55 },
    sky: { night: "#070b16" },
    // Thick dark fog: the circuit fades into the night a little way off
    fog: { color: "#070b16", near: 0.12, far: 0.9 },
    exposure: 0.8,
  },
};

/** A phone or small tablet: keep the frame rate up */
export function detectQuality(): Quality {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return (coarse && small) || memory <= 4 ? "low" : "high";
}

/** Lines on the road for the lanes and the racing line, and a disc under each car: green on the racing line, orange holding a lane. */
function buildDebug(scene: THREE.Scene, stage: Stage, rigs: Map<string, CarRig>) {
  const { path, motion } = stage;
  const hw = path.halfWidth;
  const strip = (offset: (arc: number) => number, color: string, y: number) => {
    const positions: number[] = [];
    for (let arc = 0; arc < path.length; arc += 3) {
      const quad = [arc, arc + 3].flatMap((a) => [besideLine(path, a, offset(a) - 0.25 / hw), besideLine(path, a, offset(a) + 0.25 / hw)]);
      const [p0, p1, p2, p3] = quad;
      positions.push(p0.x, y, p0.y, p2.x, y, p2.y, p1.x, y, p1.y, p1.x, y, p1.y, p2.x, y, p2.y, p3.x, y, p3.y);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })));
  };
  for (const lane of motion.lanes) strip(() => lane, "#22d3ee", 0.14);
  strip(motion.racingLine, "#facc15", 0.16);

  const discGeo = new THREE.CircleGeometry(5 * CAR_SCALE, 20).rotateX(-Math.PI / 2);
  const onLine = new THREE.MeshBasicMaterial({ color: "#22c55e", transparent: true, opacity: 0.8 });
  const inLane = new THREE.MeshBasicMaterial({ color: "#f97316", transparent: true, opacity: 0.8 });
  const discs = new Map<string, THREE.Mesh>();
  for (const [id, rig] of rigs) {
    const disc = new THREE.Mesh(discGeo, onLine);
    disc.position.y = 0.18;
    rig.root.add(disc);
    discs.set(id, disc);
  }
  return (t: number) => {
    for (const [id, disc] of discs) disc.material = motion.laneAt(id, t) === null ? onLine : inLane;
  };
}

/**
 * Trails of air off the sides of a car riding another's slipstream, for the
 * stretch of the round it was tucked in: thin, following the line the car
 * actually drove, fading out behind it. Each trail is a flat ribbon and an
 * upright one, so it shows from above, behind and the side.
 */
function buildSlipstreams(scene: THREE.Scene, stage: Stage) {
  /** Points along each trail, and how far back in time (rounds) between them */
  const POINTS = 10;
  const STEP = 0.0028;
  const SIDES = [-3.5, 3.5];
  const HEIGHT = 2.2;
  const windows = new Map<string, [number, number][]>();
  for (const e of stage.motion.events) if (e.kind === "slipstream") windows.set(e.id, [...(windows.get(e.id) ?? []), [e.t, e.end]]);
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });

  const cars = [...windows].map(([id, spans]) => {
    // Per trail and orientation, two vertices per point
    const ribbons = SIDES.length * 2;
    const vertices = ribbons * POINTS * 2;
    const position = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3);
    const color = new THREE.BufferAttribute(new Float32Array(vertices * 4), 4);
    const index: number[] = [];
    for (let r = 0; r < ribbons; r++) {
      for (let k = 0; k < POINTS - 1; k++) {
        const a = (r * POINTS + k) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", position);
    geometry.setAttribute("color", color);
    geometry.setIndex(index);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.userData.flat = true;
    scene.add(mesh);
    return { id, spans, mesh, position, color };
  });

  return (t: number) => {
    for (const car of cars) {
      const strength = Math.max(0, ...car.spans.map(([a, b]) => Math.min(1, (t - a) / 0.06, (b - t) / 0.06)));
      car.mesh.visible = strength > 0;
      if (!car.mesh.visible) continue;
      for (let k = 0; k < POINTS; k++) {
        const p = carPose(stage, car.id, Math.max(0, t - k * STEP));
        const len = Math.hypot(p.dx, p.dz) || 1;
        const [fx, fz] = [p.dx / len, p.dz / len];
        // Thinning and fading towards the tail
        const tail = k / (POINTS - 1);
        const half = 0.22 * (1 - tail * 0.8);
        const alpha = strength * (1 - tail) ** 1.5 * 0.75;
        SIDES.forEach((side, si) => {
          // Starting at the back of the car
          const cx = p.x - fx * 4 + -fz * side;
          const cz = p.z - fz * 4 + fx * side;
          const flat = ((si * 2) * POINTS + k) * 2;
          const up = ((si * 2 + 1) * POINTS + k) * 2;
          car.position.setXYZ(flat, cx + fz * half, HEIGHT, cz - fx * half);
          car.position.setXYZ(flat + 1, cx - fz * half, HEIGHT, cz + fx * half);
          car.position.setXYZ(up, cx, HEIGHT + half, cz);
          car.position.setXYZ(up + 1, cx, HEIGHT - half, cz);
          for (const v of [flat, flat + 1, up, up + 1]) car.color.setXYZW(v, 1, 1, 1, alpha);
        });
      }
      car.position.needsUpdate = true;
      car.color.needsUpdate = true;
    }
  };
}

/** Tyre smoke and black skid marks for each spin-out, worked out from the time so scrubbing replays them */
function buildSpins(scene: THREE.Scene, stage: Stage) {
  const smokeMap = smoke();
  const puffs: { sprite: THREE.Sprite; born: number; x: number; z: number; drift: number }[] = [];
  const marks: { geometry: THREE.BufferGeometry; from: number; to: number; count: number }[] = [];
  const markMat = new THREE.MeshBasicMaterial({ color: "#050505", transparent: true, opacity: 0.55, depthWrite: false });
  for (const event of stage.motion.events) {
    if (event.kind !== "spin") continue;
    for (let i = 0; i < 18; i++) {
      const born = event.t + ((event.end - event.t) * i) / 18;
      const car = carPose(stage, event.id, born);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeMap, transparent: true, depthWrite: false, color: "#e8e8e8" }));
      sprite.visible = false;
      scene.add(sprite);
      puffs.push({ sprite, born, x: car.x - car.dx * 4 * CAR_SCALE, z: car.z - car.dz * 4 * CAR_SCALE, drift: (i % 2 ? 1 : -1) * (0.5 + (i % 3)) });
    }
    // Two rubber streaks from the rear tyres, drawn as the car slides
    const steps = 48;
    const positions: number[] = [];
    let previous: [number, number][] | null = null;
    for (let k = 0; k <= steps; k++) {
      const t = event.t + ((event.end - event.t) * k) / steps;
      const car = carPose(stage, event.id, t);
      const [c, s] = [Math.cos(car.spin), Math.sin(car.spin)];
      // Forward and right of the car body, turned by the spin
      const [fx, fz] = [car.dx * c - car.dz * s, car.dz * c + car.dx * s];
      const [rx, rz] = [-fz, fx];
      const [back, track] = [REAR_AXLE * CAR_SCALE, REAR_TRACK * CAR_SCALE];
      const rear = [-1, 1].map((side) => [car.x + fx * back + rx * side * track, car.z + fz * back + rz * side * track] as [number, number]);
      if (previous) {
        for (let w = 0; w < 2; w++) {
          const [a, b] = [previous[w], rear[w]];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          const [nx, nz] = [(-(b[1] - a[1]) / len) * 0.5, ((b[0] - a[0]) / len) * 0.5];
          positions.push(a[0] - nx, 0.09, a[1] - nz, b[0] - nx, 0.09, b[1] - nz, a[0] + nx, 0.09, a[1] + nz);
          positions.push(a[0] + nx, 0.09, a[1] + nz, b[0] - nx, 0.09, b[1] - nz, b[0] + nx, 0.09, b[1] + nz);
        }
      }
      previous = rear;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    scene.add(new THREE.Mesh(geometry, markMat));
    marks.push({ geometry, from: event.t, to: event.end, count: positions.length / 3 });
  }
  return (time: number) => {
    for (const puff of puffs) {
      const age = time - puff.born;
      const life = 1.3;
      puff.sprite.visible = age > 0 && age < life;
      if (!puff.sprite.visible) continue;
      const k = age / life;
      puff.sprite.position.set(puff.x + puff.drift * k * 8, 1.2 + k * 8, puff.z + puff.drift * k * 5);
      const size = 3 + k * 20;
      puff.sprite.scale.set(size, size, 1);
      puff.sprite.material.opacity = 0.7 * (1 - k) ** 1.5;
    }
    for (const mark of marks) {
      const k = Math.min(1, Math.max(0, (time - mark.from) / (mark.to - mark.from)));
      // Whole quads only (six vertices for the two streaks)
      mark.geometry.setDrawRange(0, Math.floor((mark.count * k) / 12) * 12);
    }
  };
}

export async function createWorld(
  canvas: HTMLCanvasElement,
  stage: Stage,
  geometry: TrackGeometry,
  cars: WorldCar[],
  options: { preserve?: boolean; debug?: boolean; quality?: Quality; timeOfDay?: TimeOfDay } = {},
): Promise<World> {
  const carModel = await loadCarModel();
  const quality = options.quality ?? "high";
  const high = quality === "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !high, preserveDrawingBuffer: options.preserve ?? false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const s = stage.path.scale;
  const span = Math.max(geometry.width, geometry.height) * s;

  // Sky, and the same sky (without the sun disc) as the light reflected in every surface
  const sunDir = new THREE.Vector3();
  const makeSky = () => {
    const sky = new Sky();
    sky.scale.setScalar(span * 8);
    sky.material.uniforms.mieDirectionalG.value = 0.85;
    return sky;
  };
  const sky = makeSky();
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = makeSky();
  envSky.material.uniforms.showSunDisc.value = false;
  envScene.add(envSky);
  let environment: THREE.Texture | null = null;
  scene.environmentIntensity = LIGHTING.sky;
  scene.fog = new THREE.Fog("#ffffff", 1, 2);

  // Stars for the night sky
  const starPositions: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const dir = new THREE.Vector3().setFromSphericalCoords(span * 6, Math.acos(Math.random() * 0.95), Math.random() * Math.PI * 2);
    starPositions.push(dir.x, dir.y, dir.z);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#dfe8ff", size: 1.6, sizeAttenuation: false, fog: false }));
  scene.add(stars);

  const fill = new THREE.HemisphereLight();
  scene.add(fill);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  const shadowSize = high ? 4096 : 1536;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.35;
  scene.add(sun, sun.target);

  const track = buildScenery(scene, stage, geometry);
  const factory = carFactory(carModel, CAR_SCALE);
  const rigs = new Map(cars.map((car) => [car.id, factory.build(car.color)]));
  // The car shapes are shared by every world (the page and a recording): never dispose them here
  const sharedGeometry = new Set<THREE.BufferGeometry>();
  carModel.traverse((o) => o instanceof THREE.Mesh && sharedGeometry.add(o.geometry));
  for (const rig of rigs.values()) scene.add(rig.root);
  const updateDebug = options.debug ? buildDebug(scene, stage, rigs) : null;
  const updateSpins = buildSpins(scene, stage);
  const updateSlipstreams = buildSlipstreams(scene, stage);
  const podium = buildPodium(scene, stage);
  const outline = CEL_SHADED ? outlineMaterial() : null;
  const toon = outline ? toonify(scene, outline.material) : null;
  if (toon) {
    track.relink(toon.swap);
  }

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.3, span * 12);

  function setTimeOfDay(time: TimeOfDay) {
    const look = LOOKS[time];
    // The realistic look takes the same light, scaled to its own levels
    renderer.toneMappingExposure = look.exposure * (LIGHTING.exposure / 0.8);
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - look.sun.elevation), THREE.MathUtils.degToRad(look.sun.azimuth));
    sun.color.set(look.sun.color);
    sun.intensity = look.sun.intensity * (LIGHTING.sun / 3.2);
    fill.color.set(look.fill.sky);
    fill.groundColor.set(look.fill.ground);
    fill.intensity = look.fill.intensity * (LIGHTING.fill / 2.2);
    const fog = scene.fog as THREE.Fog;
    fog.color.set(look.fog.color);
    fog.near = span * look.fog.near;
    fog.far = span * look.fog.far;
    const night = "night" in look.sky;
    sky.visible = !night;
    stars.visible = night;
    scene.background = "night" in look.sky ? new THREE.Color(look.sky.night) : null;
    if (!("night" in look.sky)) {
      for (const u of [sky.material.uniforms, envSky.material.uniforms]) {
        u.turbidity.value = look.sky.turbidity;
        u.rayleigh.value = look.sky.rayleigh;
        u.mieCoefficient.value = look.sky.mie;
        u.sunPosition.value.copy(sunDir);
      }
    }
    // Reflections of the sky only matter in the realistic look
    if (LIGHTING.sky > 0) {
      environment?.dispose();
      environment = night ? null : pmrem.fromScene(envScene, 0, 1, span * 10).texture;
      scene.environment = environment;
    }
    track.setNight(night);
    shadowRadius = 0;
  }

  // Post-processing on high quality: ambient occlusion where things meet, a soft glow on lights and glints
  let composer: EffectComposer | null = null;
  let gtao: GTAOPass | null = null;
  let bloom: UnrealBloomPass | null = null;
  let distanceBlur: DistanceBlurPass | null = null;
  if (high) {
    // With its depth, for the distance blur
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(1, 1) });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    distanceBlur = new DistanceBlurPass(camera);
    composer.addPass(distanceBlur);
    // Soft occlusion would fight the flat bands of the cel-shaded look
    if (!CEL_SHADED) {
      gtao = new GTAOPass(scene, camera, 1, 1);
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.5, thickness: 2, scale: 1, samples: 12 });
      composer.addPass(gtao);
    }
    // Only things far brighter than the sky glow: the start lights, rain lights, glints of sun
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.4, 8);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const shadowCam = sun.shadow.camera;
  let shadowRadius = 0;
  setTimeOfDay(options.timeOfDay ?? "day");

  /** The sun's shadows cover the area the camera is looking at, snapped to texels so they don't shimmer */
  function aimShadows(pose: CameraPose) {
    const distance = Math.hypot(pose.position.x - pose.target.x, pose.position.y - pose.target.y, pose.position.z - pose.target.z);
    const radius = Math.min(360, Math.max(70, distance * 1.3 + 30));
    if (Math.abs(radius - shadowRadius) > 1) {
      shadowRadius = radius;
      Object.assign(shadowCam, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: radius * 2 + 1200 });
      shadowCam.updateProjectionMatrix();
    }
    const texel = (radius * 2) / shadowSize;
    const x = Math.round(pose.target.x / texel) * texel;
    const z = Math.round(pose.target.z / texel) * texel;
    sun.target.position.set(x, 0, z);
    sun.position.set(x + sunDir.x * 600, sunDir.y * 600, z + sunDir.z * 600);
  }

  function placeCars(time: number) {
    for (const [id, rig] of rigs) {
      const car = carPose(stage, id, time);
      rig.root.position.set(car.x, 0, car.z);
      rig.root.rotation.y = Math.atan2(-car.dz, car.dx);
      rig.spinner.rotation.y = car.spin;
      // Smoothed speed and acceleration along the track, in spaces per round
      const { speed, accel } = stage.motion.at(id, time);
      const curvature = stage.path.curvature(car.arc);
      // Nose dips under braking, the body leans out of corners
      const cornering = THREE.MathUtils.clamp(curvature * speed * speed * 0.045 * s, -0.035, 0.035);
      rig.chassis.rotation.z = THREE.MathUtils.clamp(accel * 0.0012, -0.03, 0.015);
      rig.chassis.rotation.x = -cornering;
      rig.pose({
        // Front wheels at the angle for this bend (a right turn is negative), a little exaggerated so it shows
        steer: -Math.atan(WHEELBASE * CAR_SCALE * curvature) * 1.6,
        distance: car.arc,
        // A right turn pushes the driver to the left
        lean: -cornering / 0.035,
      });
    }
  }

  function render(t: number, pose: CameraPose) {
    track.setLights(t);
    const time = Math.max(0, t);
    updateDebug?.(time);
    placeCars(time);
    podium?.place(rigs, time);
    podium?.update(time);
    updateSpins(time);
    updateSlipstreams(time);
    aimShadows(pose);

    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    // In focus well past what the camera films; the hills beyond go soft
    const focus = Math.hypot(pose.position.x - pose.target.x, pose.position.y - pose.target.y, pose.position.z - pose.target.z);
    const sharp = Math.max(focus * 3, 320 * s);
    distanceBlur?.setFocus(sharp, sharp + 900 * s);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  return {
    canvas,
    setSize(width, height, pixelRatio) {
      const ratio = high ? pixelRatio : Math.min(pixelRatio, 1.5);
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      composer?.setPixelRatio(ratio);
      composer?.setSize(width, height);
      outline?.setSize(width, height, ratio);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    render,
    setTimeOfDay,
    dispose() {
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite || o instanceof THREE.Points) {
          if (!sharedGeometry.has(o.geometry)) o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mat of mats) {
            for (const value of Object.values(mat)) if (value instanceof THREE.Texture) value.dispose();
            mat.dispose();
          }
        }
      });
      factory.dispose();
      toon?.dispose();
      outline?.material.dispose();
      envSky.geometry.dispose();
      envSky.material.dispose();
      environment?.dispose();
      pmrem.dispose();
      gtao?.dispose();
      bloom?.dispose();
      distanceBlur?.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
