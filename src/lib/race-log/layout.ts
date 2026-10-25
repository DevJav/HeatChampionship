/**
 * Track layouts for round-by-round race logs.
 *
 * Positions are counted in spaces from the start/finish line and keep
 * counting across laps: 0 is the first space past the line, the grid sits at
 * −1, −2, … and lap 2 starts at `spacesPerLap`. Each space holds two cars;
 * spot 0 is the one next to the racing line (the car that got there first,
 * so it is ahead), spot 1 the other.
 */

export type Side = "left" | "right";

export type Corner = {
  /** The corner line sits just before this space (0-based, within a lap) */
  before: number;
  /** Speed limit printed on the corner */
  limit: number;
  /** Side of the racing line, seen in the direction of travel, from this corner to the next */
  racingLine: Side;
};

export type TrackLayout = {
  slug: string;
  spacesPerLap: number;
  laps: number;
  /** In race order, starting with the first corner past the start/finish line */
  corners: Corner[];
};

/** [x, y, angle of the normal in degrees]; the normal points to the right of travel */
export type Anchor = [number, number, number];

export type TrackGeometry = {
  width: number;
  height: number;
  halfWidth: number;
  /** Centre line of the track as an SVG path */
  path: string;
  /** Divider i is the line at the start of space i (divider 0 is the start/finish line) */
  dividers: Anchor[];
  /** Centre of each space */
  spaces: Anchor[];
  /** Where to draw each corner's speed-limit badge, same order as `corners` */
  badges: [number, number][];
};

export type Point = { x: number; y: number };

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Space within the lap (0 … spacesPerLap − 1) for a running position */
export function lapSpace(layout: TrackLayout, pos: number) {
  return mod(pos, layout.spacesPerLap);
}

/** Index of the corner a lap space belongs to: the last corner line crossed to reach it */
export function cornerOf(layout: TrackLayout, space: number) {
  const { corners } = layout;
  for (let i = corners.length - 1; i >= 0; i--) if (space >= corners[i].before) return i;
  return corners.length - 1;
}

/**
 * The number printed beside a space on the board: how many spaces lie
 * between it and the next corner line (0 on the space just before the line).
 */
export function spacesToCorner(layout: TrackLayout, space: number) {
  const next = layout.corners.find((c) => c.before > space) ?? layout.corners[0];
  return mod(next.before - space - 1, layout.spacesPerLap);
}

export function cornerBehind(layout: TrackLayout, space: number) {
  return layout.corners[cornerOf(layout, space)];
}

/** Which side of the track spot 0 is on at this lap space */
export function racingLineSide(layout: TrackLayout, space: number): Side {
  return cornerBehind(layout, space).racingLine;
}

/** Running position at which a car has finished the race */
export function finishLine(layout: TrackLayout) {
  return layout.laps * layout.spacesPerLap;
}

function offset([x, y, angle]: Anchor, distance: number): Point {
  const rad = (angle * Math.PI) / 180;
  return { x: x + Math.cos(rad) * distance, y: y + Math.sin(rad) * distance };
}

/** Offset from the centre line, as a share of the lane: spot 0 on the racing-line side, spot 1 opposite */
function laneOffset(layout: TrackLayout, space: number, spot: number) {
  const side = racingLineSide(layout, space) === "right" ? 1 : -1;
  return side * (1 - 2 * spot);
}

/**
 * Where to draw a car. `pos` and `spot` may be fractional (mid-animation):
 * the point is interpolated between neighbouring space centres, so cars
 * follow the track instead of cutting across it.
 */
export function carPoint(layout: TrackLayout, geometry: TrackGeometry, pos: number, spot: number) {
  const base = Math.floor(pos);
  const t = pos - base;
  const a = geometry.spaces[lapSpace(layout, base)];
  const b = geometry.spaces[lapSpace(layout, base + 1)];
  const lane = geometry.halfWidth * 0.5;
  const pa = offset(a, lane * laneOffset(layout, lapSpace(layout, base), spot));
  const pb = offset(b, lane * laneOffset(layout, lapSpace(layout, base + 1), spot));
  const x = pa.x + (pb.x - pa.x) * t;
  const y = pa.y + (pb.y - pa.y) * t;
  // Heading along the track (the normal turned a quarter left)
  const angle = (t < 0.5 ? a[2] : b[2]) - 90;
  return { x, y, angle };
}

/** Both ends of a divider line */
export function dividerEnds(geometry: TrackGeometry, index: number): [Point, Point] {
  const anchor = geometry.dividers[index];
  return [offset(anchor, -geometry.halfWidth), offset(anchor, geometry.halfWidth)];
}

/** Control point that makes a quadratic curve from `a` to `b` pass through `mid` halfway along. */
function through(a: Point, mid: Point, b: Point): Point {
  return { x: 2 * mid.x - (a.x + b.x) / 2, y: 2 * mid.y - (a.y + b.y) / 2 };
}

/**
 * One edge of a space (−1 left of travel, 1 right) as the start, control
 * point and end of a curve through the space's centre anchor, so it bends
 * with the track instead of cutting across the bend.
 */
export function spaceEdge(geometry: TrackGeometry, space: number, side: -1 | 1): [Point, Point, Point] {
  const next = (space + 1) % geometry.dividers.length;
  const a = offset(geometry.dividers[space], side * geometry.halfWidth);
  const b = offset(geometry.dividers[next], side * geometry.halfWidth);
  return [a, through(a, offset(geometry.spaces[space], side * geometry.halfWidth), b), b];
}

// Rounded so the server and the browser write the same path (their trigonometry can differ in the last digits)
const coord = (p: Point) => `${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`;

/** A space's outline as an SVG path: straight across at the dividers, curved along the edges. */
export function spacePath(geometry: TrackGeometry, space: number) {
  const [a1, c1, b1] = spaceEdge(geometry, space, -1);
  const [a2, c2, b2] = spaceEdge(geometry, space, 1);
  return `M${coord(a1)}Q${coord(c1)} ${coord(b1)}L${coord(b2)}Q${coord(c2)} ${coord(a2)}Z`;
}

/** One edge of a space as an open SVG path, for drawing borders along it */
export function spaceEdgePath(geometry: TrackGeometry, space: number, side: -1 | 1) {
  const [a, c, b] = spaceEdge(geometry, space, side);
  return `M${coord(a)}Q${coord(c)} ${coord(b)}`;
}

/** The four corners of a space, for fitting it in view */
export function spacePolygon(geometry: TrackGeometry, space: number): Point[] {
  const next = (space + 1) % geometry.dividers.length;
  const [a1, a2] = dividerEnds(geometry, space);
  const [b1, b2] = dividerEnds(geometry, next);
  return [a1, a2, b2, b1];
}
