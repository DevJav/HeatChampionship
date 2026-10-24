import * as THREE from "three";
import { siteConfig } from "@/config/site";
import type { TrackGeometry } from "@/lib/race-log/layout";
import { besideLine, type TrackPath } from "@/lib/race-log/track-path";
import { CAR_SCALE, cameraSightLines, INTRO, tracksideCameras, type Stage } from "./director";
import * as tex from "./textures";

/**
 * The circuit around the cars: asphalt with a rubbered-in racing line,
 * raised kerbs, gravel traps, armco and tyre walls, advertising boards, the
 * start gantry, grandstand and pit building, speed-limit boards, woods and
 * rolling hills. Everything is placed from the traced centre line, and kept
 * off the track and out of the camera spots.
 */

const RED = "#d10500";
const WHITE = "#f4f4f2";

/**
 * A strip following the track between two sideways offsets (drawing units
 * from the centre line), at heights `inner` and `outer` (so kerbs can rise
 * towards the outside). `keep` can drop pieces, e.g. over another part of the track.
 */
function ribbon(
  path: TrackPath,
  from: number,
  to: number,
  inner: number,
  outer: number,
  {
    step = 4,
    uLength = 0,
    vLength = 0,
    heights = [0, 0],
    keep,
  }: { step?: number; uLength?: number; vLength?: number; heights?: [number, number]; keep?: (x: number, z: number) => boolean } = {},
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const point = (arc: number, off: number) => besideLine(path, arc, off / path.halfWidth);
  const count = Math.max(1, Math.ceil((to - from) / step));
  const [vi, vo] = vLength ? [inner / vLength, outer / vLength] : [0, 1];
  for (let i = 0; i < count; i++) {
    const [a, b] = [from + ((to - from) * i) / count, from + ((to - from) * (i + 1)) / count];
    const quad = [point(a, inner), point(a, outer), point(b, inner), point(b, outer)];
    if (keep && !quad.every((p) => keep(p.x, p.y))) continue;
    const [ua, ub] = uLength ? [a / uLength, b / uLength] : [0, 1];
    const [p0, p1, p2, p3] = quad;
    const [hi, ho] = heights;
    positions.push(p0.x, hi, p0.y, p2.x, hi, p2.y, p1.x, ho, p1.y, p1.x, ho, p1.y, p2.x, hi, p2.y, p3.x, ho, p3.y);
    uvs.push(ua, vi, ub, vi, ua, vo, ua, vo, ub, vi, ub, vo);
  }
  faceUp(positions, uvs);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The strips wind one way or the other depending on which way the track
 * turns: flip the triangles that face down, so all of them are lit from above.
 */
function faceUp(positions: number[], uvs?: number[]) {
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, az, bx, bz, cx, cz] = [positions[i], positions[i + 2], positions[i + 3], positions[i + 5], positions[i + 6], positions[i + 8]];
    // y of (b − a) × (c − a): negative means the triangle faces down
    if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) >= 0) continue;
    for (let k = 0; k < 3; k++) [positions[i + 3 + k], positions[i + 6 + k]] = [positions[i + 6 + k], positions[i + 3 + k]];
    if (uvs) {
      const j = (i / 9) * 6;
      for (let k = 0; k < 2; k++) [uvs[j + 2 + k], uvs[j + 4 + k]] = [uvs[j + 4 + k], uvs[j + 2 + k]];
    }
  }
}

/** Distance from a point to the nearest bit of centre line, to keep scenery off the track */
function distanceToTrack(path: TrackPath) {
  const samples: [number, number][] = [];
  for (let arc = 0; arc < path.length; arc += 4) {
    const p = path.at(arc);
    samples.push([p.x, p.y]);
  }
  return (x: number, z: number) => {
    let best = Infinity;
    for (const [sx, sz] of samples) best = Math.min(best, (sx - x) ** 2 + (sz - z) ** 2);
    return Math.sqrt(best);
  };
}

/** Stretches of track tight enough to get kerbs and run-off, as [from, to] lengths. */
function cornerStretches(path: TrackPath) {
  const stretches: [number, number][] = [];
  let start: number | null = null;
  for (let arc = 0; arc <= path.length; arc += 2) {
    const tight = Math.abs(path.curvature(arc)) > 1 / (110 * path.scale);
    if (tight && start === null) start = arc;
    if (!tight && start !== null) {
      stretches.push([start - 10, arc + 10]);
      start = null;
    }
  }
  if (start !== null) stretches.push([start - 10, path.length + 10]);
  return stretches;
}

const heading = (dx: number, dy: number) => Math.atan2(-dy, dx);

/** Grass with mowing stripes and large-scale patches, by world position so they don't repeat. */
function grassMaterial(surface: tex.Surface) {
  // The sky's blue would tint the grass: keep its reflected light low
  const material = new THREE.MeshStandardMaterial({ ...surface, roughness: 1, envMapIntensity: 0.35, normalScale: new THREE.Vector2(0.5, 0.5) });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vGround;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGround = (modelMatrix * vec4(transformed, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vGround;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float stripe = step(0.5, fract((vGround.x + vGround.y) / 70.0));
        float mottle = texture2D(map, vGround / 900.0).g;
        diffuseColor.rgb *= mix(0.9, 1.07, stripe) * (0.8 + 0.45 * mottle);`,
      );
  };
  return material;
}

export function buildScenery(scene: THREE.Scene, stage: Stage, geometry: TrackGeometry) {
  const { path, layout } = stage;
  const s = path.scale;
  const hw = path.halfWidth;
  const near = distanceToTrack(path);
  const clear = (margin: number) => (x: number, z: number) => near(x, z) >= margin;
  // Tall things never stand between a trackside camera and what it films
  const sightLines = cameraSightLines(stage);
  const inView = (x: number, z: number, radius: number) =>
    sightLines.some(([a, b]) => {
      const [dx, dz] = [b.x - a.x, b.z - a.z];
      const k = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(a.x + dx * k - x, a.z + dz * k - z) < radius;
    });
  const size = { x: geometry.width * s, z: geometry.height * s };
  const add = <T extends THREE.Object3D>(object: T) => {
    scene.add(object);
    return object;
  };
  const flat = (geo: THREE.BufferGeometry, material: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    // Lies on the ground: no outline in the cel-shaded look
    mesh.userData.flat = true;
    return add(mesh);
  };
  // Flat strips wind either way along the track, so they are drawn from both sides
  const standard = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, ...params });

  // Ground: flat around the circuit, rising into hills further out
  const groundSize = Math.max(size.x, size.z) * 6;
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 120, 120).rotateX(-Math.PI / 2);
  const pos = groundGeo.getAttribute("position");
  const hills = (x: number, z: number) =>
    Math.sin(x / 260) * Math.cos(z / 310) * 0.6 + Math.sin((x + z) / 170) * 0.3 + Math.cos((x - 2 * z) / 520) * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const [x, z] = [pos.getX(i) + size.x / 2, pos.getZ(i) + size.z / 2];
    // How far outside the area of the circuit
    const out = Math.max(0, Math.hypot(Math.max(0, Math.abs(x - size.x / 2) - size.x / 2 - 250), Math.max(0, Math.abs(z - size.z / 2) - size.z / 2 - 250)));
    pos.setY(i, Math.min(1, out / 900) ** 1.5 * (60 + hills(x, z) * 90) * s);
  }
  groundGeo.computeVertexNormals();
  const grassSurface = tex.grass();
  for (const t of Object.values(grassSurface)) t.repeat.set(groundSize / 40, groundSize / 40);
  const ground = flat(groundGeo, grassMaterial(grassSurface), -0.02);
  ground.position.set(size.x / 2, -0.02, size.z / 2);

  // Asphalt, and the darker rubbered-in line the cars drive on
  const asphalt = tex.asphalt();
  const asphaltMat = new THREE.MeshStandardMaterial({ ...asphalt, roughness: 1, side: THREE.DoubleSide });
  // The cel-shaded look paints it flat instead
  asphaltMat.userData.toonColor = "#3b3d42";
  flat(ribbon(path, 0, path.length, -hw - 1.5, hw + 1.5, { step: 2, uLength: 40, vLength: 40 }), asphaltMat, 0.05);
  const rubber = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const rubberGeo = (() => {
    const positions: number[] = [];
    const half = 0.18;
    for (let arc = 0; arc < path.length; arc += 3) {
      const [a, b] = [arc, arc + 3];
      const [la, lb] = [stage.motion.racingLine(a), stage.motion.racingLine(b)];
      const quad = [besideLine(path, a, la - half), besideLine(path, a, la + half), besideLine(path, b, lb - half), besideLine(path, b, lb + half)];
      const [p0, p1, p2, p3] = quad;
      positions.push(p0.x, 0, p0.y, p2.x, 0, p2.y, p1.x, 0, p1.y, p1.x, 0, p1.y, p2.x, 0, p2.y, p3.x, 0, p3.y);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  })();
  flat(rubberGeo, rubber, 0.07);
  const lineMat = standard({ color: WHITE, roughness: 0.55 });
  flat(ribbon(path, 0, path.length, -hw - 0.7, -hw + 0.3, { step: 3 }), lineMat, 0.08);
  flat(ribbon(path, 0, path.length, hw - 0.3, hw + 0.7, { step: 3 }), lineMat, 0.08);

  // Kerbs both sides of every corner, rising to the outside; gravel beyond the outside one
  const kerbMat = standard({ map: tex.stripes(RED, WHITE), roughness: 0.6 });
  const gravel = tex.gravel();
  for (const t of Object.values(gravel)) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const gravelMat = new THREE.MeshStandardMaterial({ ...gravel, roughness: 1, side: THREE.DoubleSide });
  gravelMat.userData.toonColor = "#d8c59a";
  const corners = cornerStretches(path);
  for (const [from, to] of corners) {
    flat(ribbon(path, from, to, -hw - 4, -hw - 0.6, { step: 2, uLength: 9, heights: [0.35, 0.05] }), kerbMat, 0.06);
    flat(ribbon(path, from, to, hw + 0.6, hw + 4, { step: 2, uLength: 9, heights: [0.05, 0.35] }), kerbMat, 0.06);
    const outside = -Math.sign(path.curvature((from + to) / 2)) || 1;
    const [a, b] = outside > 0 ? [hw + 4, hw + 24] : [-hw - 24, -hw - 4];
    flat(ribbon(path, from - 10, to + 25, a, b, { step: 3, uLength: 14, vLength: 14, keep: clear(hw + 2) }), gravelMat, 0.03);
  }
  const inCorner = (arc: number) => corners.some(([from, to]) => arc > from - 10 && arc < to + 25);
  const outsideAt = (arc: number) => -Math.sign(path.curvature(arc)) || 1;

  // Start/finish line and grid boxes
  flat(ribbon(path, -2.5, 2.5, -hw, hw, { step: 5 }), standard({ map: tex.chequered(2, 12), roughness: 0.6 }), 0.11);
  for (const id of stage.motion.ids) {
    const start = stage.motion.at(id, 0);
    const arc = path.arcOf(start.pos) + 9 * CAR_SCALE;
    const off = start.lat * hw;
    flat(ribbon(path, arc - 0.6, arc + 0.6, off - 4 * CAR_SCALE, off + 4 * CAR_SCALE, { step: 1.2 }), lineMat, 0.11);
  }

  // Barriers: tyre walls behind the gravel at corners, armco everywhere else
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const tyres: { x: number; z: number; y: number; red: boolean }[] = [];
  const posts: { x: number; z: number; angle: number }[] = [];
  const rail: [number, number][] = [];
  for (const side of [-1, 1]) {
    let run: number[] = [];
    const flush = () => {
      if (run.length > 1) rail.push([run[0] * side, run[run.length - 1] * side]);
      run = [];
    };
    for (let arc = 0, i = 0; arc < path.length; arc += 1.6, i++) {
      const corner = inCorner(arc) && outsideAt(arc) === side;
      const off = side * (hw + (corner ? 27 : 26));
      const p = besideLine(path, arc, off / hw);
      if (near(p.x, p.y) < hw + 24) {
        flush();
        continue;
      }
      if (corner) {
        flush();
        for (let level = 0; level < 3; level++) tyres.push({ x: p.x, z: p.y, y: 0.3 + level * 0.55, red: Math.floor(i / 4) % 2 === 0 });
      } else {
        run.push(arc);
        if (i % 4 === 0) posts.push({ x: p.x, z: p.y, angle: heading(p.dx, p.dy) });
      }
    }
    flush();
  }
  // Thousands of these: keep them low-poly and out of the shadow pass
  const tyreGeo = new THREE.TorusGeometry(0.62, 0.26, 4, 8).rotateX(Math.PI / 2);
  const tyreWall = new THREE.InstancedMesh(tyreGeo, standard({ color: "#151515", roughness: 0.85 }), tyres.length);
  tyres.forEach((t, i) => {
    m.compose(new THREE.Vector3(t.x, t.y, t.z), q.identity(), one);
    tyreWall.setMatrixAt(i, m);
    tyreWall.setColorAt(i, new THREE.Color(t.y > 1 ? (t.red ? RED : WHITE) : "#222222"));
  });
  add(tyreWall);
  const steel = standard({ color: "#b7bcc2", roughness: 0.35, metalness: 0.85 });
  const railMat = standard({ color: "#c3c8ce", roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide });
  for (const [from, to] of rail) {
    const side = Math.sign(from) || 1;
    const [a, b] = [Math.abs(from), Math.abs(to)];
    for (const height of [0.9, 1.5]) {
      const strip = ribbon(path, a, b, side * (hw + 26), side * (hw + 26.01), { step: 3 });
      // Stand the strip up: a band 0.5 high
      const p = strip.getAttribute("position");
      // Of each quad's six vertices, 2, 3 and 5 are on the outer edge: they go on top
      for (let i = 0; i < p.count; i++) p.setY(i, [2, 3, 5].includes(i % 6) ? height + 0.25 : height - 0.25);
      strip.computeVertexNormals();
      const band = new THREE.Mesh(strip, railMat);
      band.castShadow = true;
      band.userData.flat = true;
      add(band);
    }
  }
  const postGeo = new THREE.BoxGeometry(0.2, 2, 0.2);
  const postMesh = new THREE.InstancedMesh(postGeo, steel, posts.length);
  posts.forEach((p, i) => {
    q.setFromAxisAngle(up, p.angle);
    m.compose(new THREE.Vector3(p.x, 1, p.z), q, one);
    postMesh.setMatrixAt(i, m);
  });
  add(postMesh);

  // Advertising boards along the straights, behind the armco
  const adverts = [
    tex.advert("HEAT", RED, WHITE),
    tex.advert("PEDAL TO THE METAL", "#111111", "#f2a900"),
    tex.advert(siteConfig.name.toUpperCase(), WHITE, "#111111"),
  ];
  const advertMats = adverts.map((map) => standard({ map, roughness: 0.5 }));
  const boardGeo = new THREE.BoxGeometry(14, 2.4, 0.25);
  let board = 0;
  for (const side of [-1, 1]) {
    for (let arc = 30; arc < path.length; arc += 48) {
      if (inCorner(arc) || inCorner(arc + 8) || inCorner(arc - 8)) continue;
      const p = besideLine(path, arc, (side * (hw + 29)) / hw);
      if (near(p.x, p.y) < hw + 27 || inView(p.x, p.y, 9)) continue;
      const mesh = new THREE.Mesh(boardGeo, advertMats[board++ % advertMats.length]);
      mesh.position.set(p.x, 1.6, p.y);
      // Face the track
      mesh.rotation.y = heading(p.dx, p.dy) + (side > 0 ? Math.PI : 0);
      mesh.castShadow = true;
      add(mesh);
    }
  }

  // Grandstand along the start straight, outside; pit building inside
  const seatMat = standard({ map: tex.crowd(5), roughness: 1 });
  const concrete = standard({ color: "#cfd3d8", roughness: 0.85 });
  const roofMat = standard({ color: "#e5e7eb", roughness: 0.4, metalness: 0.3 });
  for (let arc = -230 * s; arc < 70 * s; arc += 22) {
    const p = besideLine(path, arc + 11, -(hw + 50) / hw);
    if (near(p.x, p.y) < hw + 42 || inView(p.x, p.y, 16)) continue;
    const segment = new THREE.Group();
    // Local +z is the right of travel: the stand climbs away from the track (-z)
    for (let tier = 0; tier < 6; tier++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 3.4), seatMat);
      step.position.set(0, 1 + tier * 2, -tier * 3.4);
      segment.add(step);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(22, 16, 1), concrete);
    back.position.set(0, 8, -19);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(23, 0.6, 24), roofMat);
    roof.position.set(0, 17, -9);
    roof.rotation.x = -0.08;
    segment.add(back, roof);
    for (const x of [-10, 10]) {
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.6, 17, 0.6), concrete);
      column.position.set(x, 8.5, -18);
      segment.add(column);
    }
    segment.position.set(p.x, 0, p.y);
    segment.rotation.y = heading(p.dx, p.dy);
    segment.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    add(segment);
  }
  const pitMat = [concrete, concrete, roofMat, concrete, standard({ map: tex.pitFront(), roughness: 0.25, metalness: 0.2 }), concrete];
  for (let arc = -260 * s; arc < -40 * s; arc += 30) {
    const p = besideLine(path, arc + 15, (hw + 46) / hw);
    if (near(p.x, p.y) < hw + 38 || inView(p.x, p.y, 18)) continue;
    const pit = new THREE.Mesh(new THREE.BoxGeometry(30, 13, 16), pitMat);
    pit.position.set(p.x, 6.5, p.y);
    // The glass front (the box's -z face) faces the track
    pit.rotation.y = heading(p.dx, p.dy) + Math.PI;
    pit.castShadow = true;
    pit.receiveShadow = true;
    add(pit);
  }

  // Gantry over the line, lights facing the grid
  const gantry = new THREE.Group();
  const dark = standard({ color: "#2b2f36", roughness: 0.45, metalness: 0.5 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.4, 18, 1.4), dark);
    post.position.set(0, 9, side * (hw + 5));
    gantry.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 2.6, hw * 2 + 10), dark);
  beam.position.set(0, 17, 0);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 14), standard({ color: "#0b0b0c", roughness: 0.6 }));
  panel.position.set(-1.2, 17, 0);
  gantry.add(beam, panel);
  const lights: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 5; i++) {
    const mat = standard({ color: "#200000", emissive: "#ff1a00", emissiveIntensity: 0, roughness: 0.3 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), mat);
    bulb.position.set(-1.6, 17, (i - 2) * 2.5);
    gantry.add(bulb);
    lights.push(mat);
  }
  const line = path.at(0);
  gantry.position.set(line.x, 0, line.y);
  gantry.rotation.y = heading(line.dx, line.dy);
  gantry.traverse((o) => (o.castShadow = true));
  add(gantry);

  // Speed-limit boards on posts where the card has its corner badges, facing the cars coming in
  const signPole = standard({ color: "#9ca3af", roughness: 0.4, metalness: 0.7 });
  layout.corners.forEach((corner, i) => {
    const [x, z] = stage.boards[i];
    const apex = path.arcOf(corner.before);
    const toward = path.at(apex - 40);
    const sign = new THREE.Mesh(new THREE.CircleGeometry(4, 32), standard({ map: tex.speedSign(corner.limit), roughness: 0.4 }));
    sign.position.set(x, 8, z);
    sign.lookAt(toward.x, 8, toward.y);
    const backing = new THREE.Mesh(new THREE.CircleGeometry(4.05, 32), signPole);
    backing.position.copy(sign.position);
    backing.rotation.copy(sign.rotation);
    backing.rotateY(Math.PI);
    backing.translateZ(0.02);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8, 8), signPole);
    pole.position.set(x, 4, z);
    for (const o of [sign, pole, backing]) {
      o.castShadow = true;
      add(o);
    }
  });

  // Woods: pines and broadleaf trees in clumps, never on the track or in front of a camera
  const cams = tracksideCameras(stage);
  const rand = tex.random(42);
  const pines: [number, number, number][] = [];
  const broad: [number, number, number][] = [];
  const area = { x0: -400, x1: size.x + 400, z0: -350, z1: size.z + 350 };
  // Bigger circuits get more trees, but not in proportion to the area: they would cost too much to draw
  const treeCount = Math.round(900 * s);
  for (let tries = 0; tries < treeCount * 8 && pines.length + broad.length < treeCount; tries++) {
    const x = area.x0 + rand() * (area.x1 - area.x0);
    const z = area.z0 + rand() * (area.z1 - area.z0);
    // Clumps: some places are woods, others open grass
    const wood = Math.sin(x / 90) * Math.cos(z / 110) + Math.sin((x + z) / 60) * 0.5;
    if (wood < 0.2 && rand() > 0.15) continue;
    if (near(x, z) < hw + 48 || cams.some((c) => Math.hypot(c.x - x, c.z - z) < 45) || inView(x, z, 10)) continue;
    (rand() < 0.55 ? pines : broad).push([x, z, 0.7 + rand() * 0.9]);
  }
  const trunkMat = standard({ color: "#5b4030" });
  const forest = (spots: [number, number, number][], crown: THREE.BufferGeometry, crownY: number, hue: number) => {
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.8, 6, 6), trunkMat, spots.length);
    const crowns = new THREE.InstancedMesh(crown, standard({ roughness: 0.95, flatShading: true }), spots.length);
    spots.forEach(([x, z, k], i) => {
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      m.compose(new THREE.Vector3(x, 3 * k, z), q, new THREE.Vector3(k, k, k));
      trunks.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, crownY * k, z), q, new THREE.Vector3(k, k * (0.9 + rand() * 0.3), k));
      crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, new THREE.Color().setHSL(hue + rand() * 0.05, 0.4 + rand() * 0.15, 0.16 + rand() * 0.1));
    });
    // Trunks are mostly hidden under the crowns: no shadow or outline for them
    trunks.userData.flat = true;
    crowns.castShadow = true;
    crowns.receiveShadow = true;
    add(trunks);
    add(crowns);
  };
  // Pines: three stacked cones
  const pine = mergeCones();
  forest(pines, pine, 5, 0.3);
  // Broadleaf: a lumpy ball
  const ball = new THREE.IcosahedronGeometry(6, 1);
  const bp = ball.getAttribute("position");
  for (let i = 0; i < bp.count; i++) {
    const k = 0.85 + ((Math.sin(bp.getX(i) * 3.1) + Math.cos(bp.getY(i) * 2.7) + Math.sin(bp.getZ(i) * 3.7)) / 3) * 0.2;
    bp.setXYZ(i, bp.getX(i) * k, bp.getY(i) * k * 0.9, bp.getZ(i) * k);
  }
  ball.computeVertexNormals();
  forest(broad, ball, 10, 0.24);

  return {
    /** Follows the start lights when their materials are swapped (cel shading) */
    relink(swap: <M extends THREE.Material>(material: M) => M) {
      lights.forEach((mat, i) => (lights[i] = swap(mat)));
    },
    setLights(t: number) {
      // One light a fifth of the intro apart, all out at the start
      lights.forEach((mat, i) => {
        const on = t < 0 && t >= -INTRO + (i * INTRO * 0.8) / 5;
        mat.emissiveIntensity = on ? 30 : 0;
      });
    },
  };
}

function mergeCones() {
  const cones = [
    new THREE.ConeGeometry(5.5, 8, 8).translate(0, 0, 0),
    new THREE.ConeGeometry(4.4, 7, 8).translate(0, 4, 0),
    new THREE.ConeGeometry(3.2, 6, 8).translate(0, 8, 0),
  ].map((g) => g.toNonIndexed());
  const positions = cones.flatMap((g) => Array.from(g.getAttribute("position").array as Float32Array));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  for (const g of cones) g.dispose();
  return geometry;
}
