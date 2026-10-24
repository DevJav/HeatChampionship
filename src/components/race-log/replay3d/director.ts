import { finishLine, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import { raceMotion, roadHalfWidthFor, type RaceMotion } from "@/lib/race-log/motion";
import type { LoggedRound } from "@/lib/race-log/rounds";
import { besideLine, trackPath, type TrackPath } from "@/lib/race-log/track-path";
import { t as text } from "@/i18n";

/**
 * Where the camera is at any moment of the 3D replay. The "TV" mode cuts
 * between shots like a race broadcast, planned ahead from the story of the
 * race (lead changes, spins, the finish), so scrubbing and recording always
 * show the same pictures. The other modes follow one car.
 *
 * World coordinates: x and z are the track drawing's x and y, y is up.
 */

export type Vec3 = { x: number; y: number; z: number };
export type CameraPose = { position: Vec3; target: Vec3; fov: number; label: string; subject: string | null };
export type CameraMode = "tv" | "chase" | "onboard" | "heli";

export const SHOT_KINDS = ["grid", "chase", "onboard", "heli", "trackside", "finish", "outro"] as const;
export type ShotKind = (typeof SHOT_KINDS)[number];
export type Shot = { start: number; end: number; kind: ShotKind; subject: string; cam?: number };

export type Caption = { start: number; end: number; text: string; color?: string; radio?: boolean };

export type Stage = {
  layout: TrackLayout;
  path: TrackPath;
  motion: RaceMotion;
  names: Record<string, string>;
  colors: Record<string, string>;
  /** Where the speed-limit boards stand (the card's corner badges) */
  boards: [number, number][];
};

/** Time before the start (in rounds) for the lights */
export const INTRO = 1;
/** When each of the five start lights comes on; all go out at 0 */
export const START_LIGHTS = [0, 1, 2, 3, 4].map((i) => -INTRO + (i * INTRO * 0.8) / 5);
/** Playback speed: seconds of replay per round on the smallest circuit; bigger ones take longer, so cars look as fast */
const SECONDS_PER_ROUND = 3.2;
/**
 * The circuit is bigger than the card (the road and its bends together) and
 * the cars smaller, so every car fits side by side, like on a real circuit:
 * the more cars, the bigger the circuit. Never smaller than MIN_TRACK_SCALE.
 */
const MIN_TRACK_SCALE = 1.3;
export const CAR_SCALE = 0.7;
/** The car model is 16 × 10.5 drawing units over the wheels before scaling (CAR_WIDTH in car-model.ts) */
const CAR_SIZE = { length: 16 * CAR_SCALE, width: 10.5 * CAR_SCALE };
/** Onboard camera on the model: just above the driver's helmet (DRIVER_EYE in car-model.ts) */
const EYE = { back: 0.82, up: 5.43 };

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

/** Where a car is and which way it points, in world coordinates. */
export function carPose({ path, motion }: Pick<Stage, "path" | "motion">, id: string, t: number) {
  const now = motion.at(id, t);
  const arc = path.arcOf(now.pos);
  const p = besideLine(path, arc, now.lat);
  // Along the track, turned towards the lane it is moving into
  const [c, s] = [Math.cos(now.heading), Math.sin(now.heading)];
  const [dx, dz] = [p.dx * c - p.dy * s, p.dy * c + p.dx * s];
  return { x: p.x, z: p.y, dx, dz, arc, spin: now.spin, pos: now.pos };
}

/** Fixed cameras beside each corner, then one at the finish line. */
export function tracksideCameras({ layout, path, boards }: Pick<Stage, "layout" | "path" | "boards">) {
  const cams = layout.corners.map((corner) => {
    const apex = path.arcOf(corner.before + 0.5);
    const outside = -Math.sign(path.curvature(apex)) || 1;
    // Up on a tower behind the barriers, a little before the apex, and not right behind a speed-limit board
    const spots = [-25, -45, -10, -65, 5].map((back) => besideLine(path, apex + back, outside * (1 + 46 / path.halfWidth)));
    const p = spots.find((q) => boards.every(([x, z]) => Math.hypot(q.x - x, q.y - z) > 40)) ?? spots[0];
    return v(p.x, 15, p.y);
  });
  // Just past the line, on the inside between the track and the barrier, looking back at the cars as they cross
  const line = besideLine(path, FINISH_CAM_PAST * path.scale, 1 + 14 / path.halfWidth);
  cams.push(v(line.x, 7, line.y));
  return cams;
}

const FINISH_CAM_PAST = 30;

/**
 * What each trackside camera films, as lines from the camera to the track:
 * the stretch round each corner's apex, and the run up to the finish line.
 * Tall scenery is kept off these lines so nothing gets in the way.
 */
export function cameraSightLines(stage: Pick<Stage, "layout" | "path" | "boards">) {
  const { layout, path } = stage;
  const cams = tracksideCameras(stage);
  const watched = [
    ...layout.corners.map((corner) => {
      const apex = path.arcOf(corner.before + 0.5);
      return [-90, -45, 0, 45, 90].map((d) => apex + d * path.scale);
    }),
    [-110, -70, -35, 0, 20].map((d) => d * path.scale),
  ];
  return cams.flatMap((cam, i) =>
    watched[i].map((arc) => {
      const p = path.at(arc);
      return [cam, v(p.x, 0, p.y)] as [Vec3, Vec3];
    }),
  );
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Leader, the car under most pressure, or whoever is fighting nearest the front. */
function battleAt(stage: Stage, t: number) {
  const order = stage.motion.order(t).filter((id) => stage.motion.finishedAt[id] === null || stage.motion.finishedAt[id]! > t);
  let best: string | null = null;
  let bestGap = 0.9;
  for (let i = 1; i < order.length; i++) {
    const gap = stage.motion.at(order[i - 1], t).pos - stage.motion.at(order[i], t).pos;
    if (gap < bestGap) [best, bestGap] = [order[i], gap];
  }
  return best ?? order[0];
}

export function planShots(stage: Stage): { shots: Shot[]; end: number } {
  const { motion } = stage;
  const cams = tracksideCameras(stage);
  const finishes = motion.official.map((id) => motion.finishedAt[id]).filter((x): x is number => x !== null);
  const firstFinish = finishes.length ? Math.min(...finishes) : null;
  const lastFinish = finishes.length === motion.ids.length ? Math.max(...finishes) : null;
  const end = lastFinish !== null ? Math.min(motion.end, lastFinish + 1.6) : motion.lastRound + 0.6;
  const racingUntil = firstFinish !== null ? firstFinish - 0.6 : end;
  const pole = motion.order(0)[0];

  const shots: Shot[] = [{ start: -INTRO, end: 0.2, kind: "grid", subject: pole }];
  const lengths = [1.1, 1.5, 1.2, 1.4];
  const rotation: ShotKind[] = ["heli", "chase", "trackside", "onboard", "chase", "trackside", "heli", "chase"];
  let t = 0.2;
  let i = 0;
  let previous: ShotKind = "grid";
  while (t < racingUntil - 0.3) {
    const len = lengths[i % lengths.length];
    let until = Math.min(racingUntil, t + len);
    // Something worth showing in (or just after) this window? Stay on it until it's over
    const beat = motion.events.find((e) => e.t >= t && e.t < until + 0.3 && (e.kind === "spin" || (e.kind === "pass" && e.lead)));
    if (beat) until = Math.min(racingUntil, Math.max(until, (beat.kind === "spin" ? beat.end : beat.t) + 0.35));
    const anyPass = motion.events.find((e) => e.kind === "pass" && e.t >= t + 0.2 && e.t < until);
    const subject = beat?.id ?? (i % 3 === 2 && anyPass ? anyPass.id : i % 2 ? battleAt(stage, t + len / 2) : motion.order(t)[0]);

    // A corner camera if the car passes near one, otherwise the next kind in the rotation
    let kind = rotation[i % rotation.length];
    let cam: number | undefined;
    const mid = carPose(stage, subject, (t + until) / 2);
    const nearest = cams
      .slice(0, -1)
      .map((c, index) => ({ index, d: dist(c, v(mid.x, 0, mid.z)) }))
      .sort((a, b) => a.d - b.d)[0];
    if ((kind === "trackside" || beat?.kind === "spin") && nearest && nearest.d < 150 * stage.path.scale) [kind, cam] = ["trackside", nearest.index];
    else if (kind === "trackside") kind = "chase";
    if (kind === previous && kind !== "chase") kind = "chase";
    shots.push({ start: t, end: until, kind, subject, cam });
    previous = kind;
    t = until;
    i++;
  }
  if (firstFinish !== null) {
    const winner = motion.official[0];
    shots.push({ start: t, end: lastFinish !== null ? lastFinish + 0.35 : end, kind: "finish", subject: winner, cam: cams.length - 1 });
    if (lastFinish !== null) shots.push({ start: lastFinish + 0.35, end, kind: "outro", subject: winner });
  }
  return { shots, end };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function chase(stage: Stage, id: string, t: number, back = 44, height = 13): Omit<CameraPose, "label"> {
  const car = carPose(stage, id, t);
  const lat = stage.motion.at(id, t).lat * 0.6;
  const p = besideLine(stage.path, car.arc - back, lat);
  const ahead = besideLine(stage.path, car.arc + 30, lat);
  return { position: v(p.x, height, p.y), target: v(lerp(car.x, ahead.x, 0.4), 2, lerp(car.z, ahead.y, 0.4)), fov: 50, subject: id };
}

function onboard(stage: Stage, id: string, t: number): Omit<CameraPose, "label"> {
  const car = carPose(stage, id, t);
  const [c, s] = [Math.cos(car.spin), Math.sin(car.spin)];
  // The spin turns the car (and the driver's view) around
  const dx = car.dx * c - car.dz * s;
  const dz = car.dx * s + car.dz * c;
  return {
    // Just ahead of the helmet, at the driver's eye line
    position: v(car.x - dx * EYE.back * CAR_SCALE, EYE.up * CAR_SCALE, car.z - dz * EYE.back * CAR_SCALE),
    target: v(car.x + dx * 40, 2.2, car.z + dz * 40),
    // Wide, so the cockpit and the cars around it fit in
    fov: 85,
    subject: id,
  };
}

function heli(stage: Stage, id: string, t: number, radius = 150, height = 120): Omit<CameraPose, "label"> {
  const car = carPose(stage, id, t);
  const angle = t * 0.22 + 1.3;
  return {
    position: v(car.x + Math.cos(angle) * radius, height, car.z + Math.sin(angle) * radius),
    target: v(car.x, 0, car.z),
    fov: 42,
    subject: id,
  };
}

/** A fixed camera turning to follow a car, zoomed so the car stays about the same size. */
function trackside(stage: Stage, cam: Vec3, id: string, t: number): Omit<CameraPose, "label"> {
  const car = carPose(stage, id, t);
  const target = v(car.x + car.dx * 6, 1.5, car.z + car.dz * 6);
  const d = dist(cam, target);
  const fov = Math.min(50, Math.max(9, ((2 * Math.atan(26 / d)) * 180) / Math.PI));
  return { position: cam, target, fov, subject: id };
}

/** The corner camera nearest a car halfway through a shot. */
export function nearestCorner(stage: Stage, subject: string, t: number) {
  const car = carPose(stage, subject, t);
  const cams = tracksideCameras(stage).slice(0, -1);
  let best = 0;
  cams.forEach((c, i) => {
    if (dist(c, v(car.x, 0, car.z)) < dist(cams[best], v(car.x, 0, car.z))) best = i;
  });
  return best;
}

/**
 * A script edited by hand, made playable: in time order, back to back from
 * the start of the replay to its end, and every shot with what it needs.
 */
export function fitShots(stage: Stage, shots: Shot[], start: number, end: number): Shot[] {
  const sorted = shots.filter((s) => s.start < end).sort((a, b) => a.start - b.start);
  if (!sorted.length) return [];
  sorted[0] = { ...sorted[0], start };
  return sorted.map((shot, i) => {
    const until = sorted[i + 1]?.start ?? end;
    const subject = stage.motion.ids.includes(shot.subject) ? shot.subject : stage.motion.official[0];
    const fitted: Shot = { start: shot.start, end: until, kind: shot.kind, subject };
    if (shot.kind === "trackside") {
      const valid = shot.cam !== undefined && shot.cam >= 0 && shot.cam < stage.layout.corners.length;
      fitted.cam = valid ? shot.cam : nearestCorner(stage, subject, (shot.start + until) / 2);
    }
    if (shot.kind === "finish") fitted.cam = stage.layout.corners.length;
    return fitted;
  });
}

/** A script saved on this device, if it still fits this race; otherwise null. */
export function readScript(stage: Stage, saved: unknown, start: number, end: number): Shot[] | null {
  if (!Array.isArray(saved) || !saved.length) return null;
  const shots: Shot[] = [];
  for (const s of saved) {
    if (typeof s?.start !== "number" || !SHOT_KINDS.includes(s.kind) || typeof s.subject !== "string") return null;
    shots.push({ start: s.start, end: s.start, kind: s.kind, subject: s.subject, cam: typeof s.cam === "number" ? s.cam : undefined });
  }
  return fitShots(stage, shots, start, end);
}

export function shotAt(shots: Shot[], t: number) {
  return shots.find((s) => t < s.end) ?? shots[shots.length - 1];
}

/** The camera for the TV mode (following the plan) or for one of the follow-a-car modes. */
export function cameraPose(stage: Stage, plan: Shot[], mode: CameraMode, follow: string, t: number): CameraPose {
  const name = (id: string) => stage.names[id] ?? "";
  const labels = text.raceLog.replay3d.cameras;
  if (mode === "chase") return { ...chase(stage, follow, t), label: `${labels.chase} · ${name(follow)}` };
  if (mode === "onboard") return { ...onboard(stage, follow, t), label: `${labels.onboard} · ${name(follow)}` };
  if (mode === "heli") return { ...heli(stage, follow, t), label: `${labels.heli} · ${name(follow)}` };

  const shot = shotAt(plan, t);
  const cams = tracksideCameras(stage);
  switch (shot.kind) {
    case "grid": {
      // Behind the grid, looking at the lights; the camera pushes in as they go out
      const k = Math.min(1, Math.max(0, (t + INTRO) / (INTRO + 0.2)));
      // Just behind the last car on the grid, however big the circuit is
      const back = Math.min(...stage.motion.ids.map((id) => stage.path.arcOf(stage.motion.at(id, 0).pos)));
      const from = besideLine(stage.path, back - 70 + k * 50, 0);
      const to = besideLine(stage.path, 15, 0);
      return { position: v(from.x, lerp(15, 10, k), from.y), target: v(to.x, 6, to.y), fov: 46, subject: null, label: text.raceLog.grid };
    }
    case "trackside": {
      const corner = stage.layout.corners[shot.cam!];
      return { ...trackside(stage, cams[shot.cam!], shot.subject, t), label: text.raceLog.corner(shot.cam! + 1, corner.limit) };
    }
    case "finish": {
      // Whoever crosses the line next, or the last one that did
      const next =
        stage.motion.official.find((id) => (stage.motion.finishedAt[id] ?? Infinity) > t - 0.12) ?? stage.motion.official.at(-1)!;
      // Still far round the lap: ride along with it until it nears the line
      const toLine = stage.path.arcOf(finishLine(stage.layout)) - stage.path.arcOf(stage.motion.at(next, t).pos);
      if (toLine > 110 * stage.path.scale) return { ...chase(stage, next, t), label: `${labels.chase} · ${name(next)}` };
      return { ...trackside(stage, cams[cams.length - 1], next, t), label: text.raceLog.replay3d.finishLine };
    }
    case "outro":
      return { ...heli(stage, shot.subject, t, 190, 90), label: labels.heli };
    case "onboard":
      return { ...onboard(stage, shot.subject, t), label: `${labels.onboard} · ${name(shot.subject)}` };
    case "heli":
      return { ...heli(stage, shot.subject, t), label: labels.heli };
    default:
      return { ...chase(stage, shot.subject, t), label: `${labels.chase} · ${name(shot.subject)}` };
  }
}

/** Lower-third captions: the start, lead changes, spins, the winner and the drivers' team radio. */
export function planCaptions(stage: Stage, radio: Record<string, string>): Caption[] {
  const { motion, names, colors } = stage;
  const r = text.raceLog.replay3d;
  const captions: Caption[] = [{ start: 0, end: 0.7, text: r.lightsOut }];
  for (const e of motion.events) {
    if (e.kind === "spin") captions.push({ start: e.t + 0.1, end: e.t + 0.9, text: r.spins(names[e.id]), color: colors[e.id] });
    if (e.kind === "pass" && e.lead) captions.push({ start: e.t, end: e.t + 0.8, text: r.takesLead(names[e.id]), color: colors[e.id] });
    if (e.kind === "finish" && e.position === 1) captions.push({ start: e.t, end: e.t + 0.8, text: r.wins(names[e.id]), color: colors[e.id] });
  }
  // Team radio after each driver's finish, one at a time
  let free = 0;
  for (const id of motion.official) {
    const at = motion.finishedAt[id];
    if (at === null || !radio[id]) continue;
    const start = Math.max(at + 0.25, free);
    captions.push({ start, end: start + 0.85, text: `${names[id]}: “${radio[id]}”`, color: colors[id], radio: true });
    free = start + 0.9;
  }
  return captions.sort((a, b) => a.start - b.start);
}

export function captionAt(captions: Caption[], t: number) {
  // The latest one that has started wins, so a radio message can cut in
  let found: Caption | null = null;
  for (const c of captions) if (t >= c.start && t < c.end) found = c;
  return found;
}

export type Replay = {
  stage: Stage;
  shots: Shot[];
  captions: Caption[];
  start: number;
  end: number;
  /** Seconds of replay per round at normal speed */
  secondsPerRound: number;
};

/** Length of the replay at normal speed, in milliseconds. */
export function replayDuration(replay: Replay) {
  return (replay.end - replay.start) * replay.secondsPerRound * 1000;
}

/** Everything the 3D replay plays from: the motion, the TV shots and the captions. */
export function prepareReplay(
  layout: TrackLayout,
  geometry: TrackGeometry,
  rounds: LoggedRound[],
  cars: { id: string; name: string; color: string }[],
  radio: Record<string, string>,
): Replay {
  const scale = Math.max(MIN_TRACK_SCALE, roadHalfWidthFor(cars.length, CAR_SIZE) / geometry.halfWidth);
  const path = trackPath(layout, geometry, scale);
  const motion = raceMotion(layout, path, rounds, CAR_SIZE);
  const stage: Stage = {
    layout,
    path,
    motion,
    names: Object.fromEntries(cars.map((c) => [c.id, c.name])),
    colors: Object.fromEntries(cars.map((c) => [c.id, c.color])),
    boards: geometry.badges.map(([x, z]) => [x * scale, z * scale]),
  };
  const { shots, end } = planShots(stage);
  const captions = planCaptions(stage, radio);
  // Let the last team radio message finish
  const lastRadio = Math.max(0, ...captions.filter((c) => c.radio).map((c) => c.end));
  return {
    stage,
    shots,
    captions,
    start: -INTRO,
    end: Math.min(motion.end, Math.max(end, lastRadio + 0.1)),
    secondsPerRound: (SECONDS_PER_ROUND * scale) / MIN_TRACK_SCALE,
  };
}
