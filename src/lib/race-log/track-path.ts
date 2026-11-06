import type { TrackGeometry, TrackLayout } from "./layout";

/**
 * The traced centre line as a smooth closed curve measured by length, for
 * the 3D replay. A running position in spaces (fractional, across laps) maps
 * to a length along the curve, and a length plus a sideways offset to a
 * point on the asphalt. Units are the drawing's (1000 × 646 for USA).
 */

export type PathPoint = {
  x: number;
  y: number;
  /** Unit direction of travel */
  dx: number;
  dy: number;
};

export type TrackPath = {
  /** How much bigger than the drawing the circuit is */
  scale: number;
  /** Length of one lap */
  length: number;
  halfWidth: number;
  spacesPerLap: number;
  /** Length from the start/finish line to each divider (divider 0 is 0) */
  dividers: number[];
  /** Point at a length from the start/finish line; any length, laps wrap */
  at(arc: number): PathPoint;
  /** Smoothed curvature at a length: positive turns right, 1 / radius */
  curvature(arc: number): number;
  /** Length along the race (keeps counting across laps) of a running position */
  arcOf(pos: number): number;
  /** Height of the road at a length: 0 except on the way up to and over a bridge */
  height(arc: number): number;
  /** How steeply the road climbs at a length, height per unit of length */
  slope(arc: number): number;
  /** 0 … 1: how close a length is to running underneath a bridge, for cameras to stay below the deck */
  under(arc: number): number;
  /** Where the track crosses itself, if it does */
  bridge: BridgeSpans | null;
};

/** Lengths along the lap; `from` can be negative, since a bridge can sit across the start line */
export type BridgeSpans = {
  /** The whole raised stretch, ramps included */
  raised: [number, number];
  /** The stretch of the road below that runs under the deck */
  below: [number, number];
};

const STEP = 1;
const SMOOTH = 30;
/** How much the traced line is evened out, in drawing units */
const EVEN_OUT = 18;
/** Height of a bridge's deck: room for a car and a low camera underneath */
export const BRIDGE_HEIGHT = 12;
/** Length of a bridge's ramps, in drawing units */
const BRIDGE_RAMP = 90;
/** Length over which a camera drops as it nears the road under a bridge, in drawing units */
const UNDER_FADE = 45;

const mod = (n: number, m: number) => ((n % m) + m) % m;

function parsePath(d: string, scale: number): [number, number][] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const points: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i] * scale, nums[i + 1] * scale]);
  return points;
}

/** Closed Catmull-Rom through the traced points, densely sampled. */
function smoothLoop(points: [number, number][], perSegment = 10) {
  const n = points.length;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [points[mod(i - 1, n)], points[i], points[mod(i + 1, n)], points[mod(i + 2, n)]];
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, e: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** Resamples a closed polyline every STEP units of length. */
function resample(points: [number, number][]) {
  const n = points.length;
  const cumulative = [0];
  for (let i = 1; i <= n; i++) {
    const [a, b] = [points[i - 1], points[i % n]];
    cumulative.push(cumulative[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cumulative[n];
  const count = Math.round(length / STEP);
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const target = (k * length) / count;
    while (cumulative[seg + 1] < target) seg++;
    const t = (target - cumulative[seg]) / (cumulative[seg + 1] - cumulative[seg] || 1);
    const [a, b] = [points[seg], points[(seg + 1) % n]];
    xs[k] = a[0] + (b[0] - a[0]) * t;
    ys[k] = a[1] + (b[1] - a[1]) * t;
  }
  return { xs, ys, length };
}

/**
 * Smooths a closed line sampled every unit with a few passes of a moving
 * average (close to a Gaussian), keeping bends where they are: tight
 * hairpins only lose a unit or two of radius.
 */
function evenOut({ xs, ys }: { xs: Float64Array; ys: Float64Array }, radius: number): [number, number][] {
  const n = xs.length;
  const r = Math.max(1, Math.round(radius));
  let [ax, ay] = [xs, ys];
  for (let pass = 0; pass < 3; pass++) {
    const [bx, by] = [new Float64Array(n), new Float64Array(n)];
    // Running sums round the loop
    let [sx, sy] = [0, 0];
    for (let k = -r; k <= r; k++) {
      sx += ax[mod(k, n)];
      sy += ay[mod(k, n)];
    }
    for (let i = 0; i < n; i++) {
      bx[i] = sx / (2 * r + 1);
      by[i] = sy / (2 * r + 1);
      sx += ax[mod(i + r + 1, n)] - ax[mod(i - r, n)];
      sy += ay[mod(i + r + 1, n)] - ay[mod(i - r, n)];
    }
    [ax, ay] = [bx, by];
  }
  return Array.from({ length: n }, (_, i) => [ax[i], ay[i]]);
}

function nearestIndex(xs: Float64Array, ys: Float64Array, x: number, y: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = (xs[i] - x) ** 2 + (ys[i] - y) ** 2;
    if (d < bestDist) [best, bestDist] = [i, d];
  }
  return best;
}

const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * Finds where the road crosses itself, starting from the bridge's spaces: the
 * stretch of them directly above another part of the track, and that other part.
 */
function findCrossing(
  xs: Float64Array,
  ys: Float64Array,
  step: number,
  length: number,
  halfWidth: number,
  [start, end]: [number, number],
): { deck: [number, number]; below: [number, number] } | null {
  const count = xs.length;
  const reach = 2 * halfWidth + 4;
  const around = (a: number, b: number) => {
    const d = mod(a - b, length);
    return Math.min(d, length - d);
  };
  let deck: [number, number] | null = null;
  let below: [number, number] | null = null;
  for (let arc = start; arc <= end; arc += 2) {
    const [x, y] = [xs[mod(Math.round(arc / step), count)], ys[mod(Math.round(arc / step), count)]];
    for (let i = 0; i < count; i += 2) {
      const other = i * step;
      // Its own stretch of road doesn't count
      if (around(other, arc) < end - start + 6 * halfWidth) continue;
      if ((xs[i] - x) ** 2 + (ys[i] - y) ** 2 > reach * reach) continue;
      deck = deck ? [Math.min(deck[0], arc), Math.max(deck[1], arc)] : [arc, arc];
      below = below ? [Math.min(below[0], other), Math.max(below[1], other)] : [other, other];
    }
  }
  return deck && below ? { deck, below } : null;
}

/** `scale` enlarges the whole circuit (road included); the 3D replay uses it to fit every car side by side. */
export function trackPath(layout: TrackLayout, geometry: TrackGeometry, scale = 1): TrackPath {
  const halfWidth = geometry.halfWidth * scale;
  // The trace follows the card by hand, a little unevenly: even it out so cars don't wobble on it
  const loop = resample(evenOut(resample(smoothLoop(parsePath(geometry.path, scale))), EVEN_OUT * scale));
  const { length } = loop;
  let { xs, ys } = loop;
  const count = xs.length;
  const step = length / count;

  // Start the curve at the start/finish line and run it in the direction of travel
  const start = nearestIndex(xs, ys, geometry.dividers[0][0] * scale, geometry.dividers[0][1] * scale);
  const next = nearestIndex(xs, ys, geometry.dividers[1][0] * scale, geometry.dividers[1][1] * scale);
  const forward = mod(next - start, count) < count / 2;
  const order = Array.from({ length: count }, (_, k) => (forward ? mod(start + k, count) : mod(start - k, count)));
  [xs, ys] = [Float64Array.from(order, (i) => xs[i]), Float64Array.from(order, (i) => ys[i])];

  const dxs = new Float64Array(count);
  const dys = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const [a, b] = [mod(i - 1, count), mod(i + 1, count)];
    const [dx, dy] = [xs[b] - xs[a], ys[b] - ys[a]];
    const len = Math.hypot(dx, dy) || 1;
    [dxs[i], dys[i]] = [dx / len, dy / len];
  }

  // Turning per unit of length, then averaged so cars ease into the line before the apex
  const raw = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const [a, b] = [mod(i - 2, count), mod(i + 2, count)];
    raw[i] = (dxs[a] * dys[b] - dys[a] * dxs[b]) / (4 * step);
  }
  const window = Math.round((SMOOTH * scale) / step);
  const curv = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (let k = -window; k <= window; k++) sum += raw[mod(i + k, count)];
    curv[i] = sum / (2 * window + 1);
  }

  const dividers = geometry.dividers.map(([x, y], i) => (i === 0 ? 0 : nearestIndex(xs, ys, x * scale, y * scale) * step));

  const sample = (arr: Float64Array, arc: number) => {
    const u = mod(arc, length) / step;
    const i = Math.floor(u);
    const t = u - i;
    return arr[i % count] * (1 - t) + arr[(i + 1) % count] * t;
  };

  const n = layout.spacesPerLap;

  // The bridge, if any: up a ramp to the deck, across the road below, and down again
  const spaces = geometry.bridge ?? [];
  const crossing = spaces.length
    ? findCrossing(xs, ys, step, length, halfWidth, [dividers[spaces[0]], dividers[spaces[spaces.length - 1] + 1] ?? length])
    : null;
  const ramp = BRIDGE_RAMP * scale;
  const fade = UNDER_FADE * scale;
  /** Distance past `from` going round the lap, as −length/2 … length/2 */
  const signed = (arc: number, from: number) => mod(arc - from + length / 2, length) - length / 2;
  const height = crossing
    ? (arc: number) => {
        const [from, to] = crossing.deck;
        const middle = (from + to) / 2;
        const away = Math.abs(signed(arc, middle)) - (to - from) / 2;
        return BRIDGE_HEIGHT * smoothstep(1 - away / ramp);
      }
    : () => 0;
  const under = crossing
    ? (arc: number) => {
        const [from, to] = crossing.below;
        const away = Math.abs(signed(arc, (from + to) / 2)) - (to - from) / 2;
        return smoothstep(1 - away / fade);
      }
    : () => 0;

  return {
    scale,
    length,
    halfWidth,
    spacesPerLap: n,
    dividers,
    at(arc) {
      const dx = sample(dxs, arc);
      const dy = sample(dys, arc);
      const len = Math.hypot(dx, dy) || 1;
      return { x: sample(xs, arc), y: sample(ys, arc), dx: dx / len, dy: dy / len };
    },
    curvature: (arc) => sample(curv, arc),
    arcOf(pos) {
      const lap = Math.floor(pos / n);
      const s = pos - lap * n;
      const i = Math.floor(s);
      const a = dividers[i];
      const b = i + 1 < n ? dividers[i + 1] : length;
      return lap * length + a + (b - a) * (s - i);
    },
    height,
    slope: (arc) => (height(arc + 1) - height(arc - 1)) / 2,
    under,
    bridge: crossing && {
      raised: [crossing.deck[0] - ramp, crossing.deck[1] + ramp],
      below: crossing.below,
    },
  };
}

/** A point beside the centre line: `lateral` is a share of the half width, positive to the right of travel. */
export function besideLine(path: TrackPath, arc: number, lateral: number) {
  const p = path.at(arc);
  const off = lateral * path.halfWidth;
  return { x: p.x - p.dy * off, y: p.y + p.dx * off, dx: p.dx, dy: p.dy };
}
