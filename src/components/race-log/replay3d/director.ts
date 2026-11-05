import { finishLine, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import { raceMotion, roadHalfWidthFor, type RaceMotion } from "@/lib/race-log/motion";
import type { LoggedRound } from "@/lib/race-log/rounds";
import { besideLine, trackPath, type TrackPath } from "@/lib/race-log/track-path";
import { t as text } from "@/i18n";

/**
 * Where the camera is at any moment of the 3D replay. The "TV" mode cuts
 * between shots like a race broadcast, planned ahead from the story of the
 * race (lead changes, spins, the finish), so scrubbing and recording always
 * show the same pictures: instant replays in the quiet moments after a
 * spin or a lead change, and the podium at the end. The other modes follow one car.
 *
 * World coordinates: x and z are the track drawing's x and y, y is up.
 */

export type Vec3 = { x: number; y: number; z: number };
export type CameraPose = {
  position: Vec3;
  target: Vec3;
  fov: number;
  label: string;
  subject: string | null;
  /** The moment of the race on screen when it isn't the current one: an instant replay */
  time?: number;
  /** During an instant replay: when it starts and ends, for the graphics */
  replay?: { from: number; to: number };
  /** No timing tower (the podium) */
  clean?: boolean;
};
export type CameraMode = "tv" | "chase" | "onboard" | "heli";

export const SHOT_KINDS = ["grid", "chase", "onboard", "heli", "trackside", "replay", "finish", "outro", "podium"] as const;
export type ShotKind = (typeof SHOT_KINDS)[number];
export type Shot = {
  start: number;
  end: number;
  kind: ShotKind;
  subject: string;
  cam?: number;
  /** Instant replay: the moment of the race it plays from, in slow motion */
  of?: number;
  /** Instant replay: where it's seen from */
  view?: ReplayView;
};

/** Where an instant replay is seen from: never the same kind of camera that showed it live */
export const REPLAY_VIEWS = ["front", "onboard", "low", "corner", "top"] as const;
export type ReplayView = (typeof REPLAY_VIEWS)[number];

export type Caption = { start: number; end: number; text: string; color?: string; radio?: boolean };

export type Stage = {
  layout: TrackLayout;
  path: TrackPath;
  motion: RaceMotion;
  names: Record<string, string>;
  colors: Record<string, string>;
  /** Where the speed-limit boards stand (the card's corner badges) */
  boards: [number, number][];
  /** The top three on the podium at the end, once everyone has finished */
  podium: Podium | null;
};

export type Podium = {
  /** When the podium shot starts */
  start: number;
  /** First, second and third */
  ids: string[];
  /** Middle of the podium, and which way it faces (towards the track) */
  x: number;
  z: number;
  face: { x: number; z: number };
};

/** Time before the start (in rounds) for the lights */
export const INTRO = 1;
/** Instant replays play at this share of real speed */
const REPLAY_RATE = 0.5;
const MAX_REPLAYS = 4;
/** Rounds on the podium at the end */
const PODIUM_LENGTH = 3.2;
/** The ceremony, in rounds from the start of the podium shot: each driver announced from third to first, then champagne */
export const PODIUM_BEATS = { third: 0.6, second: 1.1, winner: 1.6, champagne: 2.25, end: PODIUM_LENGTH };
/** The podium's steps: width and depth, the height of first, second and third, and what the stage and trim add */
export const PODIUM_STEP = { width: 13, depth: 12, heights: [5, 3.6, 2.6], lift: 1 };
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
  const podium = stage.podium;
  const end = podium ? podium.start + PODIUM_LENGTH : lastFinish !== null ? Math.min(motion.end, lastFinish + 1.6) : motion.lastRound + 0.6;
  const racingUntil = firstFinish !== null ? firstFinish - 0.6 : end;
  const pole = motion.order(0)[0];

  const shots: Shot[] = [
    { start: -INTRO, end: 0.2, kind: "grid", subject: pole },
  ];
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
    if (lastFinish !== null) shots.push({ start: lastFinish + 0.35, end: podium?.start ?? end, kind: "outro", subject: winner });
    if (podium) shots.push({ start: podium.start, end, kind: "podium", subject: winner });
  }
  return { shots: withReplays(stage, shots, racingUntil), end };
}

/**
 * Instant replays of the spins and lead changes, in slow motion, put in the
 * first quiet moment after each (nothing else worth seeing while it plays),
 * like a TV director would. The race carries on meanwhile.
 */
function withReplays(stage: Stage, shots: Shot[], racingUntil: number) {
  const { events } = stage.motion;
  // Spins first, they make the best replays; then lead changes
  const beats = [...events.filter((e) => e.kind === "spin"), ...events.filter((e) => e.kind === "pass" && e.lead)];
  const busy = events
    .filter((e) => e.kind === "spin" || e.kind === "finish" || (e.kind === "pass" && e.lead))
    .map((e) => [e.t - 0.2, ("end" in e ? e.end : e.t) + 0.3]);
  const lastLap = lastLapAt(stage);
  if (lastLap !== null) busy.push([lastLap - 0.1, lastLap + 0.8]);
  const replays: Shot[] = [];
  for (const e of beats) {
    if (replays.length >= MAX_REPLAYS) break;
    const [from, to] = e.kind === "spin" ? [e.t - 0.2, e.end + 0.1] : [e.t - 0.35, e.t + 0.2];
    const length = (to - from) / REPLAY_RATE;
    // A different angle from the one it was seen from live, and from the last replay
    const seenAs: Partial<Record<ShotKind, ReplayView>> = { trackside: "corner", onboard: "onboard", heli: "top", finish: "corner" };
    const seen = new Set(shots.filter((shot) => shot.start < to && shot.end > from).map((shot) => seenAs[shot.kind]));
    const preference: ReplayView[] = e.kind === "spin" ? ["front", "low", "corner", "top", "onboard"] : ["onboard", "front", "low", "corner", "top"];
    const middle = (from + to) / 2;
    const options = preference.filter((view) => !seen.has(view) && (view !== "corner" || nearCorner(stage, e.id, middle) !== null));
    const view = options.find((option) => option !== replays.at(-1)?.view) ?? options[0] ?? "low";
    for (let start = to + 0.3; start < to + 3 && start + length < racingUntil; start += 0.05) {
      const end = start + length;
      if (busy.some(([a, b]) => a < end && b > start) || replays.some((r) => r.start < end + 0.5 && r.end > start - 0.5)) continue;
      replays.push({ start, end, kind: "replay", subject: e.id, of: from, view });
      break;
    }
  }
  let all = shots;
  for (const replay of replays) {
    // Cut into the live shots it covers
    all = all.flatMap((shot) => {
      if (shot.end <= replay.start || shot.start >= replay.end) return [shot];
      return [
        ...(shot.start < replay.start ? [{ ...shot, end: replay.start }] : []),
        ...(shot.end > replay.end ? [{ ...shot, start: replay.end }] : []),
      ];
    });
    all.push(replay);
  }
  all.sort((a, b) => a.start - b.start);
  // A sliver of a live shot left either side would only flash: the shot before takes it over
  return all.reduce<Shot[]>((kept, shot) => {
    const previous = kept.at(-1);
    if (previous && shot.kind !== "replay" && shot.end - shot.start < 0.15) previous.end = shot.end;
    else kept.push({ ...shot });
    return kept;
  }, []);
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

/**
 * The finish-line camera: framing the cars about to cross, weighted by how
 * soon each one does, so its aim glides from car to car (and takes in a
 * bunch crossing together) instead of jumping between them.
 */
function finishLine3d(stage: Stage, cam: Vec3, t: number): Omit<CameraPose, "label"> {
  const { motion, path } = stage;
  const line = path.arcOf(finishLine(stage.layout));
  const crossing = motion.official.filter((id) => motion.finishedAt[id] !== null);
  // Mostly the next one over the line: each eases in as it nears the line and out after crossing
  const fit = crossing.map((id) => {
    const until = motion.finishedAt[id]! - t + 0.02;
    return -((until / (until > 0 ? 0.2 : 0.18)) ** 2);
  });
  const top = Math.max(...fit);
  // Every car counts, however little, so none pops in or out of the framing
  const reach = 8 * path.scale;
  const points = crossing.map((id, i) => {
    const car = carPose(stage, id, t);
    // Along the track from the line, negative still to come; a car past the line holds just beyond it
    const along = ((car.arc - line + path.length * 1.5) % path.length) - path.length / 2;
    return { id, w: Math.exp(fit[i] - top), along: Math.min(reach, along), lat: motion.at(id, t).lat };
  });
  const total = points.reduce((sum, p) => sum + p.w, 0);
  // The aim moves along the track, never far past the line, so it can't swing round
  // after a car running past the camera
  const along = points.reduce((sum, p) => sum + p.along * p.w, 0) / total;
  const lat = points.reduce((sum, p) => sum + p.lat * p.w, 0) / total;
  const aim = besideLine(path, line + along + 6, lat);
  const target = v(aim.x, 1.5, aim.y);
  // Zoom out to take in the cars that count: how spread out they are, by their weight
  const spread = 1.6 * Math.sqrt(points.reduce((sum, p) => sum + p.w * (p.along - along) ** 2, 0) / total);
  const d = dist(cam, target);
  const fov = Math.min(50, Math.max(9, ((2 * Math.atan((26 + spread) / d)) * 180) / Math.PI));
  const lead = points.reduce((a, b) => (b.w > a.w ? b : a)).id;
  return { position: cam, target, fov, subject: lead };
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
    // A replay made by hand plays back what happened just before it
    if (shot.kind === "replay") {
      fitted.of = shot.of ?? shot.start - (until - shot.start) * REPLAY_RATE - 0.2;
      fitted.view = shot.view && REPLAY_VIEWS.includes(shot.view) ? shot.view : "front";
    }
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
    shots.push({
      start: s.start,
      end: s.start,
      kind: s.kind,
      subject: s.subject,
      cam: typeof s.cam === "number" ? s.cam : undefined,
      of: typeof s.of === "number" ? s.of : undefined,
      view: REPLAY_VIEWS.includes(s.view) ? s.view : undefined,
    });
  }
  return fitShots(stage, shots, start, end);
}

/** Just behind the last car on the grid, along the track from the line (negative) */
function gridBack(stage: Stage) {
  const { path, motion } = stage;
  const back = Math.min(...motion.ids.map((id) => {
    const arc = path.arcOf(motion.at(id, 0).pos);
    return arc > path.length / 2 ? arc - path.length : arc;
  }));
  return back;
}

/** The corner camera near a car at a moment, if there is one */
function nearCorner(stage: Stage, subject: string, t: number) {
  const car = carPose(stage, subject, t);
  const cams = tracksideCameras(stage).slice(0, -1);
  return cams.find((c) => dist(c, v(car.x, 0, car.z)) < 120 * stage.path.scale) ?? null;
}

/** An instant replay of `subject` at race time `time`, seen from `view`; `middle` is the middle of the replayed moment */
function replayCamera(stage: Stage, view: ReplayView, subject: string, time: number, middle: number): Omit<CameraPose, "label"> {
  const { path } = stage;
  const car = carPose(stage, subject, time);
  switch (view) {
    case "onboard":
      return onboard(stage, subject, time);
    case "front": {
      // Low on the track ahead, looking back at the car as it comes
      const lat = stage.motion.at(subject, time).lat * 0.6;
      const p = besideLine(path, car.arc + 26, lat);
      return { position: v(p.x, 3.2, p.y), target: v(car.x, 2, car.z), fov: 42, subject };
    }
    case "top": {
      // Straight down from above, a little behind
      const behind = besideLine(path, car.arc - 12, 0);
      return { position: v(behind.x, 75, behind.y), target: v(car.x, 0, car.z), fov: 38, subject };
    }
    case "corner": {
      const cam = nearCorner(stage, subject, middle);
      if (cam) return trackside(stage, cam, subject, time);
      break;
    }
  }
  // Low beside the track just ahead of the moment, panning as the car goes by
  const at = carPose(stage, subject, middle);
  const outside = -Math.sign(path.curvature(at.arc)) || 1;
  const p = besideLine(path, at.arc + 30 * path.scale, outside * (1 + 16 / path.halfWidth));
  return trackside(stage, v(p.x, 3, p.y), subject, time);
}

/** Where first, second and third stand (the top of their step); second on the viewer's left, third on the right */
export function podiumSpots(podium: Podium) {
  const right = { x: podium.face.z, z: -podium.face.x };
  return [0, -1, 1].map((k, i) => ({
    x: podium.x + right.x * k * PODIUM_STEP.width,
    z: podium.z + right.z * k * PODIUM_STEP.width,
    y: PODIUM_STEP.heights[i] + PODIUM_STEP.lift,
  }));
}

/**
 * The ceremony: a wide shot coming down onto the podium, a close-up of each
 * driver as they're announced (third, second, then the winner), and a wide
 * shot swinging from side to side for the champagne.
 */
function podiumCamera(podium: Podium, t: number): Omit<CameraPose, "label"> {
  const age = t - podium.start;
  const { face } = podium;
  const spots = podiumSpots(podium);
  const beats = PODIUM_BEATS;
  const close = (i: number, since: number) => {
    const spot = spots[i];
    // Drifting slowly sideways, a touch below the winner so they look up at them
    const drift = (since - 0.25) * 6;
    const right = { x: face.z, z: -face.x };
    return {
      position: v(spot.x + face.x * 16 + right.x * drift, spot.y + (i === 0 ? 3 : 4.5), spot.z + face.z * 16 + right.z * drift),
      target: v(spot.x, spot.y + 2.5, spot.z),
      fov: 40,
      subject: podium.ids[i],
    };
  };
  if (age < beats.third) {
    const k = Math.min(1, age / beats.third);
    const e = k * k * (3 - 2 * k);
    const d = lerp(70, 46, e);
    return { position: v(podium.x + face.x * d, lerp(32, 15, e), podium.z + face.z * d), target: v(podium.x, 6, podium.z), fov: 40, subject: podium.ids[0] };
  }
  if (age < beats.second) return close(2, age - beats.third);
  if (age < beats.winner) return close(1, age - beats.second);
  if (age < beats.champagne) return close(0, age - beats.winner);
  const facing = Math.atan2(face.z, face.x);
  const angle = facing + Math.sin((age - beats.champagne) * 1.4) * 0.5;
  return {
    // High enough to see over the trackside boards and fences
    position: v(podium.x + Math.cos(angle) * 42, 15, podium.z + Math.sin(angle) * 42),
    target: v(podium.x, 6, podium.z),
    fov: 40,
    subject: podium.ids[0],
  };
}

export function shotAt(shots: Shot[], t: number) {
  return shots.find((s) => t < s.end) ?? shots[shots.length - 1];
}

/** Rounds the finish camera stays on a car after it crosses */
const FINISH_HOLD = 0.12;
/** Rounds before a car crosses that the finish camera takes over from a chase */
const FINISH_APPROACH = 0.3;
/** Shortest chase worth cutting to while waiting for the next finisher */
const MIN_CHASE = 0.3;

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
      const from = besideLine(stage.path, gridBack(stage) - 70 + k * 50, 0);
      const to = besideLine(stage.path, 15, 0);
      return { position: v(from.x, lerp(15, 10, k), from.y), target: v(to.x, 6, to.y), fov: 46, subject: null, label: text.raceLog.grid };
    }
    case "trackside": {
      const corner = stage.layout.corners[shot.cam!];
      return { ...trackside(stage, cams[shot.cam!], shot.subject, t), label: text.raceLog.replay3d.corner(shot.cam! + 1, corner.limit) };
    }
    case "finish": {
      // The next car still far round the lap: ride along with it until it nears the line,
      // but only when that's long enough to be a shot, not a flash between two finishers
      const { finishedAt } = stage.motion;
      const finishers = stage.motion.official.filter((id) => finishedAt[id] !== null);
      const index = finishers.findIndex((id) => finishedAt[id]! > t - FINISH_HOLD);
      if (index >= 0) {
        const next = finishers[index];
        const from = Math.max(shot.start, index > 0 ? finishedAt[finishers[index - 1]]! + FINISH_HOLD : -Infinity);
        const until = finishedAt[next]! - FINISH_APPROACH;
        if (t >= from && t < until && until - from >= MIN_CHASE) return { ...chase(stage, next, t), label: `${labels.chase} · ${name(next)}` };
      }
      return { ...finishLine3d(stage, cams[cams.length - 1], t), label: text.raceLog.replay3d.finishLine };
    }
    case "outro":
      return { ...heli(stage, shot.subject, t, 190, 90), label: labels.heli };
    case "podium":
      if (stage.podium) return { ...podiumCamera(stage.podium, t), label: text.raceLog.replay3d.podium, clean: true };
      return { ...heli(stage, shot.subject, t, 190, 90), label: labels.heli };
    case "replay": {
      const of = shot.of ?? shot.start - 1;
      const time = of + (t - shot.start) * REPLAY_RATE;
      const middle = of + ((shot.end - shot.start) * REPLAY_RATE) / 2;
      return {
        ...replayCamera(stage, shot.view ?? "low", shot.subject, time, middle),
        time,
        replay: { from: shot.start, to: shot.end },
        label: `${text.raceLog.replay3d.replay} · ${name(shot.subject)}`,
      };
    }
    case "onboard":
      return { ...onboard(stage, shot.subject, t), label: `${labels.onboard} · ${name(shot.subject)}` };
    case "heli":
      return { ...heli(stage, shot.subject, t), label: labels.heli };
    default:
      return { ...chase(stage, shot.subject, t), label: `${labels.chase} · ${name(shot.subject)}` };
  }
}

/** When the leader starts the last lap, or null for a one-lap race */
function lastLapAt({ motion, layout }: Stage) {
  if (layout.laps < 2) return null;
  const from = finishLine(layout) - layout.spacesPerLap;
  for (let t = 0; t < motion.end; t += 0.01) if (motion.at(motion.order(t)[0], t).pos >= from) return t;
  return null;
}

/** Lower-third captions: the start, lead changes, spins, the winner and the drivers' team radio. */
export function planCaptions(stage: Stage, radio: Record<string, string>): Caption[] {
  const { motion, names, colors, podium } = stage;
  const r = text.raceLog.replay3d;
  const captions: Caption[] = [
    { start: 0, end: 0.7, text: r.lightsOut },
  ];
  const lastLap = lastLapAt(stage);
  if (lastLap !== null) captions.push({ start: lastLap, end: lastLap + 0.7, text: r.lastLap });
  // Each driver on the podium announced as their close-up comes up
  if (podium) {
    const beats = [PODIUM_BEATS.winner, PODIUM_BEATS.second, PODIUM_BEATS.third];
    podium.ids.forEach((id, i) => {
      const start = podium.start + beats[i] + 0.04;
      captions.push({ start, end: start + (i === 0 ? 0.6 : 0.46), text: r.place(i + 1, names[id]), color: colors[id] });
    });
  }
  for (const e of motion.events) {
    if (e.kind === "spin") captions.push({ start: e.t + 0.1, end: e.t + 0.9, text: r.spins(names[e.id]), color: colors[e.id] });
    // Once the winner is home, the race for the lead is over
    if (e.kind === "pass" && e.lead && e.t < (motion.finishedAt[motion.official[0]] ?? Infinity) - 0.05) captions.push({ start: e.t, end: e.t + 0.8, text: r.takesLead(names[e.id]), color: colors[e.id] });
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

/** The podium, inside the circuit just past the line, once every car has finished */
function podiumFor(stage: Stage): Podium | null {
  const { motion, path } = stage;
  const top = motion.official.slice(0, 3);
  const times = motion.ids.map((id) => motion.finishedAt[id]);
  if (top.length < 3 || times.some((x) => x === null)) return null;
  const at = besideLine(path, 40 * path.scale, (path.halfWidth + 44) / path.halfWidth);
  const track = besideLine(path, 40 * path.scale, 0);
  const d = Math.hypot(track.x - at.x, track.y - at.y);
  return { start: Math.max(...(times as number[])) + 0.9, ids: top, x: at.x, z: at.y, face: { x: (track.x - at.x) / d, z: (track.y - at.y) / d } };
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
    podium: null,
  };
  stage.podium = podiumFor(stage);
  const { shots, end } = planShots(stage);
  const captions = planCaptions(stage, radio);
  // Let the last team radio message finish
  const lastRadio = Math.max(0, ...captions.filter((c) => c.radio).map((c) => c.end));
  return {
    stage,
    shots,
    captions,
    start: -INTRO,
    end: stage.podium ? Math.max(end, lastRadio + 0.1) : Math.min(motion.end, Math.max(end, lastRadio + 0.1)),
    secondsPerRound: (SECONDS_PER_ROUND * scale) / MIN_TRACK_SCALE,
  };
}
