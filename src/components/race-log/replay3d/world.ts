import * as THREE from "three";
import type { TrackGeometry } from "@/lib/race-log/layout";
import { besideLine, type TrackPath } from "@/lib/race-log/track-path";
import { carPose, INTRO, tracksideCameras, type CameraPose, type Stage } from "./director";

/**
 * The 3D scene of the replay: the traced track as a real circuit (asphalt,
 * kerbs, gravel, barriers, grandstand, start gantry, trees) and a low-poly
 * single-seater per driver in their colour. Loaded only on the 3D replay
 * page, so three.js stays out of every other bundle.
 */

export type WorldCar = { id: string; label: string; color: string };

export type World = {
  canvas: HTMLCanvasElement;
  setSize(width: number, height: number, pixelRatio: number): void;
  render(t: number, camera: CameraPose): void;
  dispose(): void;
};

const COLORS = {
  sky: "#9cc7ea",
  horizon: "#dfeaf2",
  grass: "#4f8a3c",
  grassDark: "#3f7330",
  asphalt: "#3a3c40",
  gravel: "#cdb994",
  carbon: "#16171a",
  tyre: "#101010",
  rim: "#9aa0a6",
  kerbRed: "#d10500",
  white: "#f4f4f2",
};

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Deterministic noise so every viewer (and every recording) gets the same scenery */
function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function speckled(base: string, dots: string[], size = 256, count = 5000, seed = 1) {
  const rand = random(seed);
  const texture = canvasTexture(size, size, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = dots[i % dots.length];
      ctx.globalAlpha = 0.25 + rand() * 0.35;
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function stripes(a: string, b: string) {
  const texture = canvasTexture(64, 8, (ctx) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, 32, 8);
    ctx.fillStyle = b;
    ctx.fillRect(32, 0, 32, 8);
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function chequered(columns: number, rows: number) {
  const texture = canvasTexture(columns * 8, rows * 8, (ctx) => {
    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        ctx.fillStyle = (x + y) % 2 ? "#111" : "#fff";
        ctx.fillRect(x * 8, y * 8, 8, 8);
      }
    }
  });
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function crowd(seed: number) {
  const rand = random(seed);
  const colors = ["#e11d48", "#f59e0b", "#2563eb", "#16a34a", "#f4f4f5", "#a855f7", "#111827", "#f97316"];
  return canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = "#5b6470";
    ctx.fillRect(0, 0, 256, 64);
    for (let row = 0; row < 8; row++) {
      for (let x = 0; x < 64; x++) {
        if (rand() < 0.15) continue;
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.fillRect(x * 4 + rand(), row * 8 + 2 + rand() * 2, 3, 5);
      }
    }
  });
}

function speedSign(limit: number) {
  return canvasTexture(128, 128, (ctx) => {
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = COLORS.kerbRed;
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "bold 70px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(limit), 64, 68);
  });
}

function labelTexture(label: string, color: string) {
  return canvasTexture(128, 64, (ctx) => {
    ctx.fillStyle = "rgba(8, 9, 10, 0.85)";
    ctx.beginPath();
    ctx.roundRect(4, 8, 120, 48, 10);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(4, 8, 14, 48);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 70, 34);
  });
}

function smokeTexture() {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "rgba(235,235,235,1)");
    g.addColorStop(0.5, "rgba(210,210,210,0.6)");
    g.addColorStop(1, "rgba(200,200,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

/**
 * Builds a strip that follows the track between two sideways offsets (in
 * drawing units from the centre line). `keep` can drop pieces, e.g. where
 * they would run over another part of the track.
 */
function ribbon(
  path: TrackPath,
  from: number,
  to: number,
  inner: number,
  outer: number,
  { step = 4, uLength = 0, keep }: { step?: number; uLength?: number; keep?: (x: number, z: number) => boolean } = {},
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const point = (arc: number, off: number) => besideLine(path, arc, off / path.halfWidth);
  const count = Math.max(1, Math.ceil((to - from) / step));
  for (let i = 0; i < count; i++) {
    const [a, b] = [from + ((to - from) * i) / count, from + ((to - from) * (i + 1)) / count];
    const quad = [point(a, inner), point(a, outer), point(b, inner), point(b, outer)];
    if (keep && !quad.every((p) => keep(p.x, p.y))) continue;
    const [ua, ub] = uLength ? [a / uLength, b / uLength] : [0, 1];
    const [p0, p1, p2, p3] = quad;
    positions.push(p0.x, 0, p0.y, p2.x, 0, p2.y, p1.x, 0, p1.y, p1.x, 0, p1.y, p2.x, 0, p2.y, p3.x, 0, p3.y);
    uvs.push(ua, 0, ub, 0, ua, 1, ua, 1, ub, 0, ub, 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** Distance from a point to the nearest bit of centre line, to keep scenery off the track */
function distanceToTrack(path: TrackPath) {
  const samples: [number, number][] = [];
  for (let arc = 0; arc < path.length; arc += 3) {
    const p = path.at(arc);
    samples.push([p.x, p.y]);
  }
  return (x: number, z: number) => {
    let best = Infinity;
    for (const [sx, sz] of samples) best = Math.min(best, (sx - x) ** 2 + (sz - z) ** 2);
    return Math.sqrt(best);
  };
}

/** Stretches of track tight enough to get kerbs, as [from, to] lengths. */
function cornerStretches(path: TrackPath) {
  const stretches: [number, number][] = [];
  let start: number | null = null;
  for (let arc = 0; arc <= path.length; arc += 2) {
    const tight = Math.abs(path.curvature(arc)) > 1 / 110;
    if (tight && start === null) start = arc;
    if (!tight && start !== null) {
      stretches.push([start - 10, arc + 10]);
      start = null;
    }
  }
  if (start !== null) stretches.push([start - 10, path.length + 10]);
  return stretches;
}

function buildTrack(scene: THREE.Scene, stage: Stage, geometry: TrackGeometry, center: { x: number; z: number }) {
  const { path, layout } = stage;
  const hw = path.halfWidth;
  const near = distanceToTrack(path);
  const clear = (margin: number) => (x: number, z: number) => near(x, z) >= margin;
  const disposables: { dispose(): void }[] = [];
  const add = (mesh: THREE.Object3D) => {
    scene.add(mesh);
    return mesh;
  };
  const material = (params: THREE.MeshStandardMaterialParameters) => {
    // Flat strips are seen from above only, but whichever way they wind
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide, ...params });
    disposables.push(m);
    return m;
  };
  const flat = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    return add(mesh);
  };

  // Ground
  const grass = speckled(COLORS.grass, [COLORS.grassDark, "#5d9a47", "#467d34"], 256, 9000, 7);
  grass.repeat.set(60, 60);
  const ground = flat(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), material({ map: grass }), 0);
  ground.position.set(center.x, 0, center.z);

  // Asphalt and its white edge lines
  const asphalt = speckled(COLORS.asphalt, ["#2c2e31", "#4a4c50", "#55575b"], 256, 7000, 3);
  flat(ribbon(path, 0, path.length, -hw - 1.5, hw + 1.5, { step: 3, uLength: 60 }), material({ map: asphalt }), 0.05);
  const lineMat = material({ color: COLORS.white, roughness: 0.6 });
  flat(ribbon(path, 0, path.length, -hw - 0.6, -hw + 0.4, { step: 3 }), lineMat, 0.08);
  flat(ribbon(path, 0, path.length, hw - 0.4, hw + 0.6, { step: 3 }), lineMat, 0.08);

  // Kerbs both sides of every corner, gravel on the outside
  const kerb = stripes(COLORS.kerbRed, COLORS.white);
  const kerbMat = material({ map: kerb, roughness: 0.7 });
  const gravelMat = material({ map: speckled(COLORS.gravel, ["#b9a47c", "#e0d0ae", "#a89470"], 128, 3000, 11) });
  for (const [from, to] of cornerStretches(path)) {
    flat(ribbon(path, from, to, -hw - 4, -hw - 0.6, { step: 2, uLength: 9 }), kerbMat, 0.1);
    flat(ribbon(path, from, to, hw + 0.6, hw + 4, { step: 2, uLength: 9 }), kerbMat, 0.1);
    const mid = (from + to) / 2;
    const outside = -Math.sign(path.curvature(mid)) || 1;
    const [a, b] = outside > 0 ? [hw + 4, hw + 22] : [-hw - 22, -hw - 4];
    flat(ribbon(path, from - 10, to + 25, a, b, { step: 3, keep: clear(hw + 2) }), gravelMat, 0.03);
  }

  // Start/finish line and grid boxes
  flat(ribbon(path, -2.5, 2.5, -hw, hw, { step: 5 }), material({ map: chequered(2, 12), roughness: 0.7 }), 0.11);
  for (const id of stage.motion.ids) {
    const start = stage.motion.at(id, 0);
    const arc = path.arcOf(start.pos) + 9;
    const off = start.lat * hw;
    flat(ribbon(path, arc - 0.6, arc + 0.6, off - 4, off + 4, { step: 1.2 }), lineMat, 0.11);
  }

  // Barriers: blocks of tyre wall, red and white, well off the track
  const barrierGeo = new THREE.BoxGeometry(6, 2.6, 1.6);
  disposables.push(barrierGeo);
  const barrierMat = material({ roughness: 0.8 });
  const blocks: { x: number; z: number; angle: number; red: boolean }[] = [];
  for (const side of [-1, 1]) {
    for (let arc = 0, i = 0; arc < path.length; arc += 6, i++) {
      const off = side * (hw + 26);
      const p = besideLine(path, arc, off / hw);
      if (near(p.x, p.y) < hw + 24) continue;
      blocks.push({ x: p.x, z: p.y, angle: Math.atan2(-p.dy, p.dx), red: Math.floor(i / 3) % 2 === 0 });
    }
  }
  const barriers = new THREE.InstancedMesh(barrierGeo, barrierMat, blocks.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  blocks.forEach((b, i) => {
    q.setFromAxisAngle(up, b.angle);
    m.compose(new THREE.Vector3(b.x, 1.3, b.z), q, new THREE.Vector3(1, 1, 1));
    barriers.setMatrixAt(i, m);
    barriers.setColorAt(i, new THREE.Color(b.red ? COLORS.kerbRed : COLORS.white));
  });
  barriers.castShadow = true;
  barriers.receiveShadow = true;
  add(barriers);

  // Grandstand along the start straight, on the outside
  const outside = -1;
  const standMat = material({ map: crowd(5), roughness: 1 });
  const roofMat = material({ color: "#d8dde3", roughness: 0.6 });
  const stand = new THREE.Group();
  for (let arc = -230; arc < 70; arc += 22) {
    const p = besideLine(path, arc + 11, (outside * (hw + 48)) / hw);
    if (near(p.x, p.y) < hw + 40) continue;
    const segment = new THREE.Group();
    for (let tier = 0; tier < 4; tier++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(22, 3, 6), tier === 3 ? roofMat : standMat);
      // Local +z is the right of travel: tiers step back and up, away from the track
      box.position.set(0, 1.5 + tier * 3, outside * tier * 5);
      segment.add(box);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(23, 0.8, 24), roofMat);
    roof.position.set(0, 16, outside * 8);
    segment.add(roof);
    segment.position.set(p.x, 0, p.y);
    segment.rotation.y = Math.atan2(-p.dy, p.dx);
    segment.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        disposables.push(o.geometry);
      }
    });
    stand.add(segment);
  }
  add(stand);

  // Gantry over the line, lights facing the grid
  const gantry = new THREE.Group();
  const steel = material({ color: "#2b2f36", roughness: 0.5, metalness: 0.4 });
  const postGeo = new THREE.BoxGeometry(1.4, 18, 1.4);
  const beamGeo = new THREE.BoxGeometry(2, 2.6, hw * 2 + 10);
  disposables.push(postGeo, beamGeo);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, steel);
    post.position.set(0, 9, side * (hw + 5));
    gantry.add(post);
  }
  const beam = new THREE.Mesh(beamGeo, steel);
  beam.position.set(0, 17, 0);
  gantry.add(beam);
  const lightGeo = new THREE.SphereGeometry(0.85, 12, 8);
  disposables.push(lightGeo);
  const lights: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 5; i++) {
    const mat = material({ color: "#300", emissive: "#ff1a00", emissiveIntensity: 0 });
    const bulb = new THREE.Mesh(lightGeo, mat);
    bulb.position.set(-1.1, 17, (i - 2) * 2.4);
    gantry.add(bulb);
    lights.push(mat);
  }
  const line = path.at(0);
  gantry.position.set(line.x, 0, line.y);
  gantry.rotation.y = Math.atan2(-line.dy, line.dx);
  gantry.traverse((o) => (o.castShadow = true));
  add(gantry);

  // Speed-limit boards where the card has its corner badges
  layout.corners.forEach((corner, i) => {
    const [x, z] = geometry.badges[i];
    const map = speedSign(corner.limit);
    const mat = new THREE.SpriteMaterial({ map });
    disposables.push(map, mat);
    const sign = new THREE.Sprite(mat);
    sign.scale.set(9, 9, 1);
    sign.position.set(x, 10, z);
    add(sign);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6, 6), steel);
    pole.position.set(x, 3, z);
    disposables.push(pole.geometry);
    add(pole);
  });

  // Trees all around, never on the track or in front of a camera
  const cams = tracksideCameras(stage);
  const rand = random(42);
  const spots: [number, number, number][] = [];
  for (let tries = 0; tries < 4000 && spots.length < 420; tries++) {
    const x = -300 + rand() * (geometry.width + 600);
    const z = -260 + rand() * (geometry.height + 520);
    if (near(x, z) < hw + 46 || cams.some((c) => Math.hypot(c.x - x, c.z - z) < 40)) continue;
    spots.push([x, z, 0.7 + rand() * 0.8]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.8, 1.1, 6, 6);
  const crownGeo = new THREE.ConeGeometry(6, 16, 7);
  disposables.push(trunkGeo, crownGeo);
  const trunks = new THREE.InstancedMesh(trunkGeo, material({ color: "#6b4a2b" }), spots.length);
  const crowns = new THREE.InstancedMesh(crownGeo, material({ color: "#2f6b2f", roughness: 0.9 }), spots.length);
  spots.forEach(([x, z, s], i) => {
    m.compose(new THREE.Vector3(x, 3 * s, z), q.identity(), new THREE.Vector3(s, s, s));
    trunks.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, (6 + 8) * s, z), q.identity(), new THREE.Vector3(s, s, s));
    crowns.setMatrixAt(i, m);
    crowns.setColorAt(i, new THREE.Color().setHSL(0.27 + rand() * 0.08, 0.45, 0.22 + rand() * 0.1));
  });
  add(trunks);
  add(crowns);

  return {
    disposables,
    setLights(t: number) {
      // One light a fifth of the intro apart, all out at the start
      lights.forEach((mat, i) => {
        const on = t < 0 && t >= -INTRO + (i * INTRO * 0.8) / 5;
        mat.emissiveIntensity = on ? 3 : 0;
        mat.color.set(on ? "#ff2200" : "#300");
      });
    },
  };
}

type CarModel = { group: THREE.Group; body: THREE.Group; wheels: THREE.Mesh[]; label: THREE.Sprite };

function buildCar(color: string, label: string, shared: { carbon: THREE.Material; tyre: THREE.Material; rim: THREE.Material }) {
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 });
  const helmet = new THREE.MeshStandardMaterial({ color: "#f5f5f5", roughness: 0.3 });
  const body = new THREE.Group();
  const box = (w: number, h: number, d: number, x: number, y: number, mat: THREE.Material, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    body.add(mesh);
    return mesh;
  };
  // The car points along +x; 16 units long, about the size of a real F1 car next to the track
  box(14, 0.4, 5.6, -0.4, 0.55, shared.carbon); // floor
  box(8, 1.8, 2.6, 0.6, 1.7, paint); // monocoque
  box(5.2, 1.1, 1.5, 6.2, 1.25, paint); // nose
  box(5, 1.5, 5.4, -0.8, 1.45, paint); // sidepods
  box(5.2, 2, 1.8, -3.6, 2.3, paint); // engine cover
  box(1.4, 1.5, 1.1, -1.3, 3.4, shared.carbon); // airbox
  box(1.6, 0.3, 7.8, 8.1, 0.55, shared.carbon); // front wing
  box(1.7, 0.35, 6.4, -7.3, 3.9, paint); // rear wing
  for (const z of [-3.2, 3.2]) box(2.4, 3, 0.25, -7.3, 2.6, shared.carbon, z); // rear endplates
  for (const z of [-3.9, 3.9]) box(2, 1, 0.2, 8, 0.9, shared.carbon, z); // front endplates
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), helmet);
  head.position.set(1.0, 2.95, 0);
  head.castShadow = true;
  body.add(head);

  const wheels: THREE.Mesh[] = [];
  const tyreGeo = new THREE.CylinderGeometry(1.35, 1.35, 1.8, 18).rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.86, 10).rotateX(Math.PI / 2);
  for (const [x, z] of [
    [5, 3.6],
    [5, -3.6],
    [-4.6, 3.7],
    [-4.6, -3.7],
  ]) {
    const wheel = new THREE.Mesh(tyreGeo, shared.tyre);
    wheel.add(new THREE.Mesh(rimGeo, shared.rim));
    wheel.position.set(x, 1.35, z);
    wheel.castShadow = true;
    body.add(wheel);
    wheels.push(wheel);
  }

  const group = new THREE.Group();
  group.add(body);
  // Same size on screen however far the camera is
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(label, color), depthTest: false, transparent: true, sizeAttenuation: false }));
  tag.scale.set(0.07, 0.035, 1);
  tag.position.set(0, 9, 0);
  tag.renderOrder = 10;
  group.add(tag);
  return { group, body, wheels, label: tag } satisfies CarModel;
}

export function createWorld(canvas: HTMLCanvasElement, stage: Stage, geometry: TrackGeometry, cars: WorldCar[], options: { preserve?: boolean } = {}): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: options.preserve ?? false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const center = { x: geometry.width / 2, z: geometry.height / 2 };
  const sky = canvasTexture(4, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#4f8fd1");
    g.addColorStop(0.6, COLORS.sky);
    g.addColorStop(1, COLORS.horizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  });
  scene.background = sky;
  scene.fog = new THREE.Fog(COLORS.horizon, 700, 2600);

  scene.add(new THREE.HemisphereLight("#dceeff", "#4a6b3a", 1.1));
  const sun = new THREE.DirectionalLight("#fff4e0", 2.4);
  sun.position.set(center.x - 350, 600, center.z - 250);
  sun.target.position.set(center.x, 0, center.z);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -650, right: 650, top: 650, bottom: -650, near: 10, far: 1600 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  const track = buildTrack(scene, stage, geometry, center);

  const shared = {
    carbon: new THREE.MeshStandardMaterial({ color: COLORS.carbon, roughness: 0.5, metalness: 0.3 }),
    tyre: new THREE.MeshStandardMaterial({ color: COLORS.tyre, roughness: 0.9 }),
    rim: new THREE.MeshStandardMaterial({ color: COLORS.rim, roughness: 0.4, metalness: 0.7 }),
  };
  const models = new Map(cars.map((car) => [car.id, buildCar(car.color, car.label, shared)]));
  for (const model of models.values()) scene.add(model.group);

  // Tyre smoke for each spin-out, worked out from the time so scrubbing replays it
  const smokeMap = smokeTexture();
  const puffs: { sprite: THREE.Sprite; born: number; x: number; z: number; drift: number }[] = [];
  for (const event of stage.motion.events) {
    if (event.kind !== "spin") continue;
    for (let i = 0; i < 16; i++) {
      const born = event.t + ((event.end - event.t) * i) / 16;
      const car = carPose(stage, event.id, born);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeMap, transparent: true, depthWrite: false }));
      sprite.visible = false;
      scene.add(sprite);
      puffs.push({ sprite, born, x: car.x - car.dx * 5, z: car.z - car.dz * 5, drift: (i % 2 ? 1 : -1) * (0.5 + (i % 3)) });
    }
  }

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 6000);

  function render(t: number, pose: CameraPose) {
    track.setLights(t);
    const time = Math.max(0, t);
    for (const [id, model] of models) {
      const car = carPose(stage, id, time);
      model.group.position.set(car.x, 0, car.z);
      model.group.rotation.y = Math.atan2(-car.dz, car.dx);
      model.body.rotation.y = car.spin;
      // Wheels turn with the distance covered
      const spinAngle = -car.arc / 1.35;
      for (const wheel of model.wheels) wheel.rotation.z = spinAngle;
      model.label.visible = !(pose.subject === id && pose.fov > 60);
    }
    for (const puff of puffs) {
      const age = time - puff.born;
      const life = 1.1;
      puff.sprite.visible = age > 0 && age < life;
      if (!puff.sprite.visible) continue;
      const k = age / life;
      puff.sprite.position.set(puff.x + puff.drift * k * 8, 1.5 + k * 9, puff.z + puff.drift * k * 5);
      const size = 4 + k * 22;
      puff.sprite.scale.set(size, size, 1);
      puff.sprite.material.opacity = 0.6 * (1 - k);
    }

    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    renderer.render(scene, camera);
  }

  return {
    canvas,
    setSize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    render,
    dispose() {
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite || o instanceof THREE.InstancedMesh) {
          o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mat of mats) {
            (mat as THREE.MeshStandardMaterial).map?.dispose();
            mat.dispose();
          }
        }
      });
      for (const d of track.disposables) d.dispose();
      sky.dispose();
      renderer.dispose();
    },
  };
}
