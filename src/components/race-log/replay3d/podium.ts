import * as THREE from "three";
import { siteConfig } from "@/config/site";
import type { CarRig } from "./car-model";
import { PODIUM_BEATS, PODIUM_STEP, podiumSpots, type Stage } from "./director";
import * as tex from "./textures";

/**
 * The podium ceremony at the end: a stage inside the circuit past the line,
 * the top three cars up on gold, silver and bronze steps with their trophies,
 * the drivers cheering as each is announced, confetti cannons for the
 * winner and champagne to finish. Worked out from the time, like everything
 * else, so scrubbing replays it. The camera work is in the director.
 */

const STEP = PODIUM_STEP;
const HEIGHTS = PODIUM_STEP.heights;
const LIFT = PODIUM_STEP.lift;
const TRIM = ["#d9a520", "#c3c7cf", "#c27a3a"];
const CONFETTI = 600;
const SPRAY = 300;
const CONFETTI_COLOURS = ["#e8112d", "#f2a900", "#ffffff", "#1f6bff", "#12b84a", "#ff6fb5"];
/** Where the steps are along the podium, as the viewer sees it: second on the left, third on the right */
const ACROSS = [0, -1, 1];

/** A step-and-repeat sponsor wall */
function sponsorWall() {
  return tex.canvasTexture(1024, 384, (ctx) => {
    ctx.fillStyle = "#101826";
    ctx.fillRect(0, 0, 1024, 384);
    const names = ["HEAT", "PEDAL TO THE METAL", siteConfig.name.toUpperCase()];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const name = names[(row + col) % names.length];
        ctx.fillStyle = name === "HEAT" ? "#e8112d" : row % 2 ? "#f2a900" : "#ffffff";
        ctx.font = `italic 900 ${name === "HEAT" ? 46 : 22}px sans-serif`;
        ctx.fillText(name, 128 + col * 256 + (row % 2) * 64 - 32, 48 + row * 96);
      }
    }
  });
}

/** A trophy cup, turned on a lathe */
function trophyGeometry() {
  const profile = [
    [0, 0],
    [1.1, 0],
    [1.1, 0.35],
    [0.45, 0.5],
    [0.3, 1.3],
    [0.5, 1.5],
    [1.15, 1.9],
    [1.35, 2.9],
    [1.2, 2.95],
    [0.95, 2.1],
    [0, 1.9],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(profile, 16);
}

export function buildPodium(scene: THREE.Scene, stage: Stage) {
  const podium = stage.podium;
  if (!podium) return null;
  const rand = tex.random(41);
  const { face } = podium;
  const spots = podiumSpots(podium);
  const beats = PODIUM_BEATS;

  // Built facing +z, then turned to face the track; local +x is the viewer's right
  const group = new THREE.Group();
  group.position.set(podium.x, 0, podium.z);
  group.rotation.y = Math.atan2(face.x, face.z);
  const standard = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.6, ...params });
  const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Stage, with a red carpet up to the steps
  add(new THREE.Mesh(new THREE.BoxGeometry(STEP.width * 3 + 14, 0.6, STEP.depth + 16), standard({ color: "#2a2d33" })), 0, 0.3, 2);
  add(new THREE.Mesh(new THREE.BoxGeometry(STEP.width * 3, 0.66, 6), standard({ color: "#b3121b" })), 0, 0.33, STEP.depth / 2 + 4);

  const white = standard({ color: "#f4f5f7" });
  HEIGHTS.forEach((height, i) => {
    const number = standard({
      map: tex.canvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = "#f4f5f7";
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = i === 0 ? "#d10500" : "#111111";
        ctx.font = "italic 900 96px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), 64, 70);
      }),
    });
    const x = ACROSS[i] * STEP.width;
    // The numbered face towards the track (the box's +z), a coloured slab on top
    add(new THREE.Mesh(new THREE.BoxGeometry(STEP.width, height, STEP.depth), [white, white, white, white, number, white]), x, height / 2 + 0.6, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(STEP.width + 0.3, 0.4, STEP.depth + 0.3), standard({ color: TRIM[i], metalness: 0.6, roughness: 0.3 })), x, height + 0.8, 0);
    // The trophy, at the front corner of the step
    const cup = new THREE.Mesh(trophyGeometry(), standard({ color: TRIM[i], metalness: 0.8, roughness: 0.25 }));
    cup.scale.setScalar(i === 0 ? 0.75 : 0.6);
    add(cup, x + 4.8, height + LIFT, STEP.depth / 2 - 1.4);
  });

  // Sponsor wall behind, chequered flags either side
  add(new THREE.Mesh(new THREE.BoxGeometry(STEP.width * 3 + 10, 16, 0.8), standard({ map: sponsorWall(), roughness: 0.5 })), 0, 8.6, -STEP.depth / 2 - 3);
  const chequer = standard({ map: tex.chequered(6, 4), side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const x = side * (STEP.width * 1.5 + 7.5);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 20, 6), standard({ color: "#c9ced6", metalness: 0.5 })), x, 10, -STEP.depth / 2 - 1.6);
    const flag = add(new THREE.Mesh(new THREE.PlaneGeometry(6, 4), chequer), x - side * 3.2, 17.6, -STEP.depth / 2 - 1.6);
    flag.rotation.y = side * 0.25;
  }
  scene.add(group);

  // Confetti: two bursts from cannons at the ends of the wall, then fluttering down
  const right = { x: face.z, z: -face.x };
  const cannons = [-1, 1].map((side) => ({
    x: podium.x + right.x * side * (STEP.width * 1.5 + 6) - face.x * 4,
    z: podium.z + right.z * side * (STEP.width * 1.5 + 6) - face.z * 4,
    side,
  }));
  const paper = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 0.85), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONFETTI);
  const pieces = Array.from({ length: CONFETTI }, (_, i) => {
    paper.setColorAt(i, new THREE.Color(CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]));
    const cannon = cannons[i % 2];
    // Up and in towards the middle, spreading
    const inward = -cannon.side * (7 + rand() * 15);
    const forward = (rand() - 0.3) * 15;
    return {
      cannon,
      at: (i < CONFETTI / 2 ? beats.winner : beats.champagne) + rand() * 0.12,
      vx: right.x * inward + face.x * forward,
      vz: right.z * inward + face.z * forward,
      rise: 12 + rand() * 10,
      fall: 9 + rand() * 6,
      phase: rand() * Math.PI * 2,
      axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      tumble: 8 + rand() * 10,
    };
  });
  // The pieces fly far from where the mesh started: always draw it
  paper.frustumCulled = false;
  paper.visible = false;
  scene.add(paper);

  // Champagne: drops sprayed from each car, most from the winner
  const drops = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.45, 0),
    new THREE.MeshBasicMaterial({ color: "#fff3c4", transparent: true, opacity: 0.85 }),
    SPRAY,
  );
  const facing = Math.atan2(face.z, face.x);
  const spray = Array.from({ length: SPRAY }, (_, i) => ({
    from: i < SPRAY / 2 ? 0 : i < (SPRAY * 3) / 4 ? 1 : 2,
    launch: beats.champagne + (i / SPRAY) * (beats.end - beats.champagne - 0.3) + rand() * 0.05,
    angle: facing + (rand() - 0.5) * 2.2,
    speed: 38 + rand() * 18,
    up: 40 + rand() * 16,
  }));
  drops.frustumCulled = false;
  drops.visible = false;
  scene.add(drops);

  const dummy = new THREE.Object3D();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  /** Each driver's arms go up when they're announced; the winner pumps them */
  const cheerAt = [beats.winner, beats.second, beats.third];

  return {
    /** Puts the top three up on the podium once it's their moment */
    place(rigs: Map<string, CarRig>, t: number) {
      const age = t - podium.start;
      if (age < 0) return;
      podium.ids.forEach((id, i) => {
        const rig = rigs.get(id);
        if (!rig) return;
        rig.root.position.set(spots[i].x, spots[i].y, spots[i].z);
        rig.root.rotation.y = Math.atan2(-face.z, face.x);
        rig.spinner.rotation.y = 0;
        rig.chassis.rotation.set(0, 0, 0);
        const since = age - cheerAt[i];
        const up = Math.min(1, Math.max(0, since / 0.08));
        const pump = i === 0 ? 0.25 * (1 - Math.cos(since * 18)) : 0.12 * (1 - Math.cos(since * 9));
        rig.pose({ steer: 0, distance: 0, lean: 0, cheer: up * (0.75 + pump) });
      });
    },
    update(t: number) {
      const age = t - podium.start;
      paper.visible = drops.visible = age >= 0;
      if (age < 0) return;
      pieces.forEach((p, i) => {
        const k = age - p.at;
        if (k < 0) return paper.setMatrixAt(i, hidden);
        // Shot out fast, slowed by the air, then drifting down
        const out = 1 - Math.exp(-6 * k);
        const y = Math.max(0.65, 2 + p.rise * out - p.fall * k);
        dummy.position.set(p.cannon.x + p.vx * out + Math.sin(k * 5 + p.phase) * 1.2, y, p.cannon.z + p.vz * out + Math.cos(k * 4 + p.phase));
        if (y <= 0.65) dummy.rotation.set(-Math.PI / 2, 0, p.phase);
        else dummy.quaternion.setFromAxisAngle(p.axis, k * p.tumble);
        dummy.updateMatrix();
        paper.setMatrixAt(i, dummy.matrix);
      });
      paper.instanceMatrix.needsUpdate = true;
      spray.forEach((d, i) => {
        const k = age - d.launch;
        if (k < 0 || k > 0.3) return drops.setMatrixAt(i, hidden);
        const spot = spots[d.from];
        const reach = d.speed * k;
        dummy.position.set(spot.x + Math.cos(d.angle) * reach, spot.y + 4.2 + d.up * k - 260 * k * k, spot.z + Math.sin(d.angle) * reach);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1 - k * 1.5);
        dummy.updateMatrix();
        dummy.scale.setScalar(1);
        drops.setMatrixAt(i, dummy.position.y > 0 ? dummy.matrix : hidden);
      });
      drops.instanceMatrix.needsUpdate = true;
    },
  };
}
