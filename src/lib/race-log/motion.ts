import { finishLine, lapSpace, type TrackLayout } from "./layout";
import { rankHistory } from "./insights";
import { classification, type LoggedRound } from "./rounds";
import type { TrackPath } from "./track-path";

/**
 * Turns a round-by-round log into continuous motion for the 3D replay, so
 * it looks like a race instead of cars hopping between spaces.
 *
 * Time is counted in rounds: 0 is the grid and round r ends at t = r. Every
 * car covers exactly the spaces it moved in each round, but how it gets
 * there is made up: speeds blend smoothly from one round to the next, cars
 * brake for corners (slower the lower the speed limit), pull out to pass,
 * tuck in behind to slipstream and roll on after the flag.
 */

export type CarMotion = {
  /** Running position in spaces, fractional */
  pos: number;
  /** Sideways position: −1 … 1 of the half width, positive to the right of travel */
  lat: number;
  /** Which way the car points relative to the track, radians, positive to the right (changing lanes) */
  heading: number;
  /** Extra rotation from a spin-out, radians */
  spin: number;
};

export type MotionEvent =
  | { kind: "pass"; t: number; id: string; other: string; lead: boolean }
  | { kind: "spin"; t: number; end: number; id: string }
  | { kind: "finish"; t: number; id: string; position: number };

export type RaceMotion = {
  ids: string[];
  /** Last round of the log */
  lastRound: number;
  /** Time when the motion ends, after the cars have rolled on past the flag */
  end: number;
  at(id: string, t: number): CarMotion;
  /** Running order at a time: finished cars in the official order, then by track position */
  order(t: number): string[];
  /** Rounds behind the leader (or behind the winner at the line), null for the leader */
  gap(id: string, t: number): number | null;
  /** Time each car crossed the line, if it did */
  finishedAt: Record<string, number | null>;
  /** Official classification from the log */
  official: string[];
  events: MotionEvent[];
  /** For the debug view: the lanes across the road (shares of the half width), the racing line
   * at a length along the track, and the lane a car holds at a time (null on the racing line) */
  lanes: number[];
  racingLine(arc: number): number;
  laneAt(id: string, t: number): number | null;
};

/** The car beside the racing line arrived first; the other one sits a bit behind. */
const SPOT_BEHIND = 0.3;
/** Rounds of rolling on after the last round */
const COAST_ROUNDS = 4;
const SAMPLES_PER_ROUND = 48;
/** Size of a car in drawing units, wheels included */
export type CarSize = { length: number; width: number };
/** Room between two cars side by side, and between a car and the edge of the road */
const LANE_GAP = 1.4;
const EDGE_GAP = 1.2;

/** Half width of a road with one lane per car. */
export function roadHalfWidthFor(cars: number, car: CarSize) {
  return ((cars - 1) * (car.width + LANE_GAP) + car.width + 2 * EDGE_GAP) / 2;
}

const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Relative speed (0 … 1] at each point of the lap: flat out on the
 * straights, braking to the apex and accelerating out of it.
 */
function speedProfile(layout: TrackLayout) {
  const n = layout.spacesPerLap;
  return (pos: number) => {
    const s = lapSpace(layout, pos) + (pos - Math.floor(pos));
    let v = 1;
    for (const corner of layout.corners) {
      const slowest = Math.min(0.85, 0.32 + 0.07 * corner.limit);
      const apex = corner.before + 0.5;
      let ahead = (((apex - s) % n) + n) % n;
      if (ahead > n / 2) ahead -= n;
      const ramp = ahead >= 0 ? ahead / 3 : -ahead / 4.5;
      v = Math.min(v, slowest + (1 - slowest) * smoothstep(ramp));
    }
    return v;
  };
}

/** Time cost of covering track: integral of 1 / speed, tabulated so it can be inverted. */
function costTable(layout: TrackLayout, from: number, to: number) {
  const speed = speedProfile(layout);
  const res = 16;
  const count = Math.ceil((to - from) * res) + 1;
  const table = new Float64Array(count);
  for (let i = 1; i < count; i++) {
    const mid = from + (i - 0.5) / res;
    table[i] = table[i - 1] + 1 / res / speed(mid);
  }
  const cost = (pos: number) => {
    const u = clamp((pos - from) * res, 0, count - 1);
    const i = Math.min(count - 2, Math.floor(u));
    return table[i] + (table[i + 1] - table[i]) * (u - i);
  };
  const position = (c: number) => {
    let [lo, hi] = [0, count - 1];
    if (c <= table[0]) return from;
    if (c >= table[hi]) return from + hi / res;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (table[m] <= c) lo = m;
      else hi = m;
    }
    return from + (lo + (c - table[lo]) / (table[hi] - table[lo])) / res;
  };
  return { cost, position };
}

/** Moving average over ±radius samples (shorter at the ends). */
function smooth(values: Float64Array, radius: number) {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const [from, to] = [Math.max(0, i - radius), Math.min(values.length - 1, i + radius)];
    let sum = 0;
    for (let k = from; k <= to; k++) sum += values[k];
    out[i] = sum / (to - from + 1);
  }
  return out;
}

/** Fritsch–Carlson slopes: a smooth curve through the points that never overshoots them. */
function monotoneSlopes(y: number[], zero: Set<number>) {
  const n = y.length;
  const delta = y.slice(1).map((v, i) => v - y[i]);
  const m = y.map((_, i) => {
    if (i === 0) return delta[0] ?? 0;
    if (i === n - 1) return delta[n - 2];
    return delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * delta[i];
      m[i + 1] = tau * b * delta[i];
    }
  }
  for (const i of zero) m[i] = 0;
  return m;
}

function hermite(y: number[], m: number[], t: number) {
  const i = clamp(Math.floor(t), 0, y.length - 2);
  const u = clamp(t - i, 0, 1);
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * m[i] + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * m[i + 1];
}

export function raceMotion(layout: TrackLayout, path: TrackPath, rounds: LoggedRound[], car: CarSize = { length: 16, width: 9 }): RaceMotion {
  const ids = Object.keys(rounds[0].positions);
  // Cars this close (in spaces) are alongside each other and need their own lane
  const OVERLAP = (car.length + 4) / (path.length / layout.spacesPerLap);
  // Closest two cars side by side may be, and how far out a car can go, as shares of the half width
  const SEPARATION = (car.width + LANE_GAP) / path.halfWidth;
  const LAT_MAX = 1 - (car.width / 2 + EDGE_GAP) / path.halfWidth;
  const lastRound = rounds.length - 1;
  const end = lastRound + COAST_ROUNDS;
  const finish = finishLine(layout);
  const table = costTable(layout, -30, finish + 120);

  // Where each car is at the end of every round, then rolling on past the flag
  const progress = new Map<string, (t: number) => number>();
  const spins: { id: string; round: number }[] = [];
  for (const id of ids) {
    const knots = rounds.map((r) => r.positions[id].pos - SPOT_BEHIND * r.positions[id].spot);
    const zero = new Set([0]);
    const crossed = rounds.findIndex((r) => r.positions[id].pos >= finish);
    const from = crossed > 0 ? crossed : lastRound;
    const lastMove = from > 0 ? knots[from] - knots[from - 1] : 0;
    knots.length = from + 1;
    for (let r = from + 1, k = 1; r <= end; r++, k++) {
      knots.push(knots[r - 1] + (crossed > 0 ? Math.max(1.2, lastMove * 0.62 ** k) : 0));
    }
    if (crossed < 0) zero.add(lastRound);
    rounds.forEach((r, i) => {
      // A spin-out leaves the car stopped before the corner
      if (i > 0 && i <= from && r.flags[id]?.spun) {
        zero.add(i);
        spins.push({ id, round: i });
      }
    });
    const costs = knots.map(table.cost);
    const slopes = monotoneSlopes(costs, zero);
    progress.set(id, (t) => table.position(hermite(costs, slopes, clamp(t, 0, end))));
  }

  // Photo finishes follow the official order: cars that cross the line in the
  // same round reach it in that order, so a car may have to pass just before it
  const official = classification(layout, rounds);
  const crossingRound = (id: string) => rounds.findIndex((r) => r.positions[id].pos >= finish);
  const crossingTime = (id: string, r: number) => {
    let [lo, hi] = [r - 1, r];
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (progress.get(id)!(mid) >= finish) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  for (let r = 1; r <= lastRound; r++) {
    const group = official.filter((id) => crossingRound(id) === r);
    const natural = group.map((id) => crossingTime(id, r));
    const wanted = [...natural].sort((a, b) => a - b);
    group.forEach((id, i) => {
      const [from, to] = [natural[i], wanted[i]];
      if (from === to) return;
      // Within the round, reach the line at `to` instead of `from`
      const base = progress.get(id)!;
      const warp = (t: number) =>
        t <= r - 1 || t >= r ? t : t < to ? r - 1 + ((t - (r - 1)) * (from - (r - 1))) / (to - (r - 1)) : from + ((t - to) * (r - from)) / (r - to);
      progress.set(id, (t) => base(warp(t)));
    });
  }

  const spinOf = (id: string, t: number) => {
    for (const s of spins) {
      if (s.id !== id) continue;
      const u = (t - (s.round - 0.55)) / 0.5;
      if (u > 0 && u < 1.6) return { angle: Math.PI * 2 * smoothstep(Math.min(1, u)), active: u < 1 };
    }
    return null;
  };

  // Sideways positions: everyone follows the racing line (inside at the apex) until
  // cars are, or are about to be, alongside each other. Then each of them takes one
  // of a few fixed lanes across the road, the car in front choosing first, and keeps
  // it until the road around it is clear again.
  const count = end * SAMPLES_PER_ROUND + 1;
  const dt = 1 / SAMPLES_PER_ROUND;
  const posSamples = new Map(ids.map((id) => [id, Float64Array.from({ length: count }, (_, k) => progress.get(id)!(k * dt))]));
  const latSamples = new Map(ids.map((id) => [id, new Float64Array(count)]));
  const posAt = (id: string, k: number) => posSamples.get(id)![Math.min(count - 1, k)];

  const laneCount = Math.max(2, Math.min(ids.length, Math.floor((2 * LAT_MAX) / SEPARATION + 1e-6) + 1));
  const lanes = Array.from({ length: laneCount }, (_, i) => -LAT_MAX + (2 * LAT_MAX * i) / (laneCount - 1));
  const nearestLane = (l: number) => lanes.reduce((best, x, i) => (Math.abs(x - l) < Math.abs(lanes[best] - l) ? i : best), 0);
  // How far ahead (in samples) to check who will end up alongside whom, so cars move over in time
  const LOOKAHEAD = [0, 4, 8, 12];
  // A car goes back to the racing line once it has been clear for this many samples
  const RELEASE = 14;

  // Grid: spot 0 on one side, spot 1 on the other
  const lat = new Map(ids.map((id) => [id, (rounds[0].positions[id].spot === 0 ? -0.6 : 0.6) * SEPARATION]));
  const lane = new Map<string, number | null>(ids.map((id) => [id, null]));
  const laneSamples = new Map(ids.map((id) => [id, new Int8Array(count)]));
  const racingLineAt = (arc: number) => 0.8 * LAT_MAX * Math.tanh(path.curvature(arc) * 80 * path.scale);
  const clearSince = new Map(ids.map((id) => [id, 0]));

  for (let k = 0; k < count; k++) {
    const t = k * dt;
    const sorted = [...ids].sort((a, b) => posAt(b, k) - posAt(a, k));
    const alongside = (a: string, b: string) => LOOKAHEAD.some((o) => Math.abs(posAt(a, k + o) - posAt(b, k + o)) < OVERLAP);
    const taken = new Map<string, number>();
    for (const id of sorted) {
      const current = lat.get(id)!;
      const arc = path.arcOf(posAt(id, k));
      const spin = spinOf(id, t);
      const racingLine = racingLineAt(arc);
      const others = sorted.filter((other) => other !== id && alongside(id, other));
      // Cars right beside it now, which it can't drive through
      const beside = others.filter((other) => Math.abs(posAt(other, k) - posAt(id, k)) < OVERLAP).map((other) => lat.get(other)!);
      const blocks = (from: number, to: number) => beside.filter((b) => Math.min(from, to) < b && b < Math.max(from, to)).length;

      if (others.length) clearSince.set(id, k);
      else if (k - clearSince.get(id)! > RELEASE) lane.set(id, null);

      let target = racingLine;
      if (spin?.active) {
        // Sliding wide, off line: whatever lane it is in is taken
        target = -Math.sign(path.curvature(arc + 60 * path.scale) || 1) * LAT_MAX;
        taken.set(id, nearestLane(current));
      } else if (lane.get(id) !== null || others.length) {
        const busy = new Set(others.filter((o) => taken.has(o)).map((o) => taken.get(o)!));
        const keep = lane.get(id) ?? nearestLane(current);
        let chosen = keep;
        if (busy.has(keep)) {
          // The free lane closest to where the car is, leaning towards the racing line,
          // without crossing a car alongside to get there
          let best = Infinity;
          lanes.forEach((x, i) => {
            const score = (busy.has(i) ? 10 : 0) + 5 * blocks(current, x) + Math.abs(x - current) + 0.4 * Math.abs(x - racingLine);
            if (score < best) [best, chosen] = [score, i];
          });
        }
        lane.set(id, chosen);
        taken.set(id, chosen);
        target = lanes[chosen];
      }

      // Sideways speed grows with forward speed, so lane changes take a car length or two
      const moved = Math.abs(posAt(id, k + 1) - posAt(id, k));
      const rate = 0.03 + 0.55 * moved;
      let next = current + clamp(target - current, -rate, rate);
      // Stop short of a car beside it rather than sliding into it (moving away is always fine)
      for (const b of beside) {
        if (Math.abs(current - b) < SEPARATION) continue;
        if (current < b) next = Math.min(next, b - SEPARATION);
        else next = Math.max(next, b + SEPARATION);
      }
      lat.set(id, next);
    }
    for (const id of ids) {
      latSamples.get(id)![k] = lat.get(id)!;
      laneSamples.get(id)![k] = lane.get(id) ?? -1;
    }
  }

  // Smooth the simulated lanes so cars glide across instead of twitching from step to step,
  // then point each car the way it is actually going: along the track, turned by its lane change
  const headingSamples = new Map<string, Float64Array>();
  for (const id of ids) {
    const lats = smooth(smooth(latSamples.get(id)!, 6), 6);
    latSamples.set(id, lats);
    const pos = posSamples.get(id)!;
    const heading = new Float64Array(count);
    for (let k = 0; k < count; k++) {
      const [a, b] = [Math.max(0, k - 1), Math.min(count - 1, k + 1)];
      const sideways = (lats[b] - lats[a]) * path.halfWidth;
      const forward = path.arcOf(pos[b]) - path.arcOf(pos[a]);
      // Barely moving: don't let a small shuffle swing the car round
      heading[k] = clamp(Math.atan(sideways / Math.max(Math.abs(forward), 4)), -0.35, 0.35);
    }
    headingSamples.set(id, smooth(heading, 4));
  }

  const sampleAt = (arr: Float64Array, t: number) => {
    // Catmull-Rom, so speeds (and headings) change smoothly between samples too
    const u = clamp(t, 0, end) * SAMPLES_PER_ROUND;
    const i = Math.min(count - 2, Math.floor(u));
    const f = u - i;
    const [p0, p1, p2, p3] = [arr[Math.max(0, i - 1)], arr[i], arr[i + 1], arr[Math.min(count - 1, i + 2)]];
    return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
  };

  const finishedAt: Record<string, number | null> = {};
  for (const id of ids) {
    const arr = posSamples.get(id)!;
    const k = arr.findIndex((p) => p >= finish);
    finishedAt[id] = k <= 0 ? (k === 0 ? 0 : null) : (k - 1 + (finish - arr[k - 1]) / (arr[k] - arr[k - 1])) * dt;
  }

  const order = (t: number) => {
    const done = official.filter((id) => finishedAt[id] !== null && finishedAt[id]! <= t);
    const racing = ids
      .filter((id) => !done.includes(id))
      .sort((a, b) => sampleAt(posSamples.get(b)!, t) - sampleAt(posSamples.get(a)!, t));
    return [...done, ...racing];
  };

  const gap = (id: string, t: number) => {
    const leader = order(t)[0];
    if (id === leader) return null;
    const lt = finishedAt[leader];
    const mine = finishedAt[id];
    if (lt !== null && mine !== null && mine <= t) return Math.max(0, mine - lt);
    // How long ago the leader was where this car is now
    const p = sampleAt(posSamples.get(id)!, t);
    const arr = posSamples.get(leader)!;
    let k = Math.min(count - 1, Math.floor(clamp(t, 0, end) * SAMPLES_PER_ROUND));
    while (k > 0 && arr[k] > p) k--;
    const tk = k + (arr[k + 1] > arr[k] ? clamp((p - arr[k]) / (arr[k + 1] - arr[k]), 0, 1) : 0);
    return Math.max(0, t - tk * dt);
  };

  // Story beats for the director and the captions
  const events: MotionEvent[] = [];
  for (const s of spins) events.push({ kind: "spin", t: s.round - 0.55, end: s.round - 0.05, id: s.id });
  official.forEach((id, i) => {
    const t = finishedAt[id];
    if (t !== null) events.push({ kind: "finish", t, id, position: i + 1 });
  });
  const ranks = rankHistory(layout, rounds);
  for (let r = 1; r <= lastRound; r++) {
    for (const id of ids) {
      for (const other of ids) {
        if (ranks[r - 1][id] <= ranks[r - 1][other] || ranks[r][id] >= ranks[r][other]) continue;
        // When during the round the cars actually swapped
        let when = r - 0.5;
        const [a, b] = [posSamples.get(id)!, posSamples.get(other)!];
        for (let k = (r - 1) * SAMPLES_PER_ROUND; k < r * SAMPLES_PER_ROUND; k++) {
          if (a[k] <= b[k] && a[k + 1] > b[k + 1]) when = (k + 1) * dt;
        }
        events.push({ kind: "pass", t: when, id, other, lead: ranks[r][id] === 1 && ranks[r - 1][other] === 1 });
      }
    }
  }
  events.sort((a, b) => a.t - b.t);

  return {
    ids,
    lastRound,
    end,
    at(id, t) {
      return {
        pos: progress.get(id)!(t),
        lat: sampleAt(latSamples.get(id)!, t),
        heading: sampleAt(headingSamples.get(id)!, t),
        spin: spinOf(id, t)?.angle ?? 0,
      };
    },
    order,
    gap,
    finishedAt,
    official,
    events,
    lanes,
    racingLine: racingLineAt,
    laneAt(id, t) {
      const lane = laneSamples.get(id)![Math.round(clamp(t, 0, end) * SAMPLES_PER_ROUND)];
      return lane < 0 ? null : lane;
    },
  };
}
