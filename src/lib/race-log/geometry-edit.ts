import type { Anchor, Point, Side, TrackGeometry } from "./layout";

/**
 * Hand-editing a traced track (the /dev/trazado editor).
 *
 * The editable model is the centre line as a closed polyline, the dividers as
 * distances along it, the half width and the badges. Everything else in a
 * TrackGeometry is derived from those, the same way scripts/trace-track.py
 * derives it: each divider's normal comes from the line's direction there,
 * and each space's centre sits halfway along the line between its dividers
 * (or as far along as it was, for a space whose centre was set well off halfway).
 */
export type EditModel = {
  width: number;
  height: number;
  halfWidth: number;
  vertices: Point[];
  /** Distance along the centre line from vertex 0, one per divider, in lap order */
  dividers: number[];
  badges: [number, number][];
  /** Spaces on a bridge (Japan), carried through untouched */
  bridge?: number[];
  /**
   * Spaces whose centre sits well off halfway (Japan's space 29, on the short
   * piece before the bridge): the share of the way along the space it sits at.
   */
  offCentre?: Record<number, number>;
  /**
   * Racing-line side of each corner's stretch (corner to corner), in race order.
   * It belongs to the layout, not the geometry: edited here so undo covers it,
   * ignored by toGeometry and saved with replaceRacingLines.
   */
  racingLines?: Side[];
};

const r1 = (v: number) => Math.round(v * 10) / 10;

/** The vertices of a `M x y L x y … Z` path */
export function parsePath(path: string): Point[] {
  const nums = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
  return points;
}

/** Cumulative length at each vertex; the last entry is the whole closed loop */
export function cumulative(vertices: Point[]) {
  const cum = [0];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return cum;
}

const wrap = (s: number, total: number) => ((s % total) + total) % total;

/** The point at distance `s` along the closed line */
export function pointAt(vertices: Point[], cum: number[], s: number): Point {
  const total = cum[cum.length - 1];
  const d = wrap(s, total);
  let lo = 0;
  let hi = vertices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid - 1;
  }
  const a = vertices[lo];
  const b = vertices[(lo + 1) % vertices.length];
  const len = cum[lo + 1] - cum[lo] || 1;
  const t = (d - cum[lo]) / len;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Anchor at distance `s`: the point and the angle of the normal to the right of travel */
export function anchorAt(vertices: Point[], cum: number[], s: number): Anchor {
  const p = pointAt(vertices, cum, s);
  // Direction over a short stretch either side, so a vertex doesn't make the normal jump
  const a = pointAt(vertices, cum, s - 6);
  const b = pointAt(vertices, cum, s + 6);
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const angle = (Math.atan2(tx, -ty) * 180) / Math.PI; // normal (−ty, tx)
  return [r1(p.x), r1(p.y), r1(angle)];
}

/** Distance along the line of the point on it nearest to `p`, looking only between `from` and `to` when given */
export function project(vertices: Point[], cum: number[], p: Point, from?: number, to?: number) {
  const total = cum[cum.length - 1];
  let best = { s: 0, d: Infinity };
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const s = cum[i] + t * (cum[i + 1] - cum[i]);
    if (from !== undefined && to !== undefined && !within(s, from, to, total)) continue;
    const d = Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
    if (d < best.d) best = { s, d };
  }
  return best;
}

/** Whether `s` lies on the stretch going forward from `from` to `to` (which may wrap past vertex 0) */
function within(s: number, from: number, to: number, total: number) {
  const span = wrap(to - from, total);
  return wrap(s - from, total) <= span;
}

export function fromGeometry(geometry: TrackGeometry): EditModel {
  const vertices = parsePath(geometry.path);
  const cum = cumulative(vertices);
  const total = cum[cum.length - 1];
  // Each divider onto the line, keeping lap order: search just ahead of the previous one
  const dividers: number[] = [];
  geometry.dividers.forEach(([x, y], i) => {
    const p = { x, y };
    const s = i === 0 ? project(vertices, cum, p).s : project(vertices, cum, p, dividers[i - 1], dividers[i - 1] + total / 4).s;
    dividers.push(s);
  });
  const offCentre: Record<number, number> = {};
  geometry.spaces.forEach(([x, y], i) => {
    const from = dividers[i];
    const span = wrap(dividers[(i + 1) % dividers.length] - from, total);
    const share = wrap(project(vertices, cum, { x, y }, from, from + span).s - from, total) / span;
    if (Math.abs(share - 0.5) > 0.15) offCentre[i] = Math.round(share * 1000) / 1000;
  });
  return {
    width: geometry.width,
    height: geometry.height,
    halfWidth: geometry.halfWidth,
    vertices,
    dividers,
    badges: geometry.badges.map(([x, y]) => [x, y]),
    ...(geometry.bridge && { bridge: geometry.bridge.slice() }),
    ...(Object.keys(offCentre).length > 0 && { offCentre }),
  };
}

export function toGeometry(model: EditModel): TrackGeometry {
  const { vertices, dividers } = model;
  const cum = cumulative(vertices);
  const total = cum[cum.length - 1];
  const n = dividers.length;
  return {
    width: model.width,
    height: model.height,
    halfWidth: model.halfWidth,
    path: "M" + vertices.map((v) => `${r1(v.x)} ${r1(v.y)}`).join(" L") + " Z",
    dividers: dividers.map((s) => anchorAt(vertices, cum, s)),
    spaces: dividers.map((s, i) => anchorAt(vertices, cum, s + wrap(dividers[(i + 1) % n] - s, total) * (model.offCentre?.[i] ?? 0.5))),
    badges: model.badges.map(([x, y]) => [Math.round(x), Math.round(y)]),
    ...(model.bridge && { bridge: model.bridge.slice() }),
  };
}

/** Where the dividers sit after the line changes: each stays on the same point of the board, moved onto the new line. */
export function reproject(before: EditModel, vertices: Point[]): number[] {
  const oldCum = cumulative(before.vertices);
  const cum = cumulative(vertices);
  const total = cum[cum.length - 1];
  const out: number[] = [];
  before.dividers.forEach((s, i) => {
    const p = pointAt(before.vertices, oldCum, s);
    out.push(i === 0 ? project(vertices, cum, p).s : project(vertices, cum, p, out[i - 1], out[i - 1] + total / 4).s);
  });
  return out;
}

/** Averages each vertex in `indices` with its neighbours, a few times: irons out wobbles */
export function smooth(vertices: Point[], indices: number[], passes = 4): Point[] {
  let current = vertices;
  const n = vertices.length;
  for (let pass = 0; pass < passes; pass++) {
    const next = current.slice();
    for (const i of indices) {
      const a = current[(i - 1 + n) % n];
      const b = current[(i + 1) % n];
      const c = current[i];
      next[i] = { x: c.x * 0.5 + (a.x + b.x) * 0.25, y: c.y * 0.5 + (a.y + b.y) * 0.25 };
    }
    current = next;
  }
  return current;
}

/** Indices from `a` to `b` going forward round the loop */
export function rangeIndices(a: number, b: number, n: number) {
  const out = [];
  for (let i = a; ; i = (i + 1) % n) {
    out.push(i);
    if (i === b || out.length > n) break;
  }
  return out;
}

const anchors = (list: Anchor[]) => "[" + list.map((a) => `[${a.join(", ")}]`).join(", ") + "]";

/** The geometry as the `export const …: TrackGeometry = { … };` block of a track file */
export function serializeGeometry(name: string, g: TrackGeometry) {
  return `export const ${name}: TrackGeometry = {
  width: ${g.width},
  height: ${g.height},
  halfWidth: ${g.halfWidth},
  path: "${g.path}",
  // [x, y, normal angle in degrees]; the normal points to the right of travel
  dividers: ${anchors(g.dividers)},
  spaces: ${anchors(g.spaces)},
  badges: [
${g.badges.map(([x, y]) => `    [${x}, ${y}],\n`).join("")}  ],${g.bridge ? `\n  bridge: [${g.bridge.join(", ")}],` : ""}
};
`;
}

const LAYOUT_BLOCK = /export const \w+: TrackLayout = \{[\s\S]*?\n\};\n/;

/**
 * A track file's source with its layout's racing-line sides replaced, in race
 * order; null when the file has no layout block or a different number of corners.
 */
export function replaceRacingLines(source: string, sides: Side[]): string | null {
  const block = source.match(LAYOUT_BLOCK)?.[0];
  if (!block) return null;
  const found = block.match(/racingLine: "(left|right)"/g) ?? [];
  if (found.length !== sides.length) return null;
  let i = 0;
  const next = block.replace(/racingLine: "(left|right)"/g, () => `racingLine: "${sides[i++]}"`);
  return source.replace(block, next);
}
