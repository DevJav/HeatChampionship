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
};

const STEP = 1;
const SMOOTH = 30;

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

function nearestIndex(xs: Float64Array, ys: Float64Array, x: number, y: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = (xs[i] - x) ** 2 + (ys[i] - y) ** 2;
    if (d < bestDist) [best, bestDist] = [i, d];
  }
  return best;
}

/** `scale` enlarges the whole circuit (road included); the 3D replay uses it to fit every car side by side. */
export function trackPath(layout: TrackLayout, geometry: TrackGeometry, scale = 1): TrackPath {
  const halfWidth = geometry.halfWidth * scale;
  const loop = resample(smoothLoop(parsePath(geometry.path, scale)));
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
  };
}

/** A point beside the centre line: `lateral` is a share of the half width, positive to the right of travel. */
export function besideLine(path: TrackPath, arc: number, lateral: number) {
  const p = path.at(arc);
  const off = lateral * path.halfWidth;
  return { x: p.x - p.dy * off, y: p.y + p.dx * off, dx: p.dx, dy: p.dy };
}
