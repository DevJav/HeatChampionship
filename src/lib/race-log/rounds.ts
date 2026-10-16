import { finishLine, lapSpace, type TrackLayout } from "./layout";

/**
 * Round-by-round race log rules. Only end-of-round positions are recorded;
 * turn order, the spot within a space and the finishing order follow from
 * them.
 */

export type CarState = { pos: number; spot: number };
export type Positions = Record<string, CarState>;
export type CarFlags = { slipstream?: boolean; spun?: boolean };

export type LoggedRound = {
  /** Where every car ended the round */
  positions: Positions;
  flags: Record<string, CarFlags>;
};

/** Spaces a tap may go back from the car's position (spin-outs). Anything further is read as a move forward. */
const MAX_BACKWARDS = 15;

/** Starting grid from car ids in grid order: two per space behind the start/finish line. */
export function gridPositions(carIds: string[]): Positions {
  return Object.fromEntries(carIds.map((id, i) => [id, { pos: -1 - Math.floor(i / 2), spot: i % 2 }]));
}

/** Ahead first: further along, then the car on the racing line. */
export function compareCars(a: CarState, b: CarState) {
  return b.pos - a.pos || a.spot - b.spot;
}

export function isFinished(layout: TrackLayout, car: CarState) {
  return car.pos >= finishLine(layout);
}

/** Who moves this round, leader first. Finished cars are out. */
export function turnOrder(layout: TrackLayout, positions: Positions) {
  return Object.keys(positions)
    .filter((id) => !isFinished(layout, positions[id]))
    .sort((a, b) => compareCars(positions[a], positions[b]));
}

export function carsAt(positions: Positions, pos: number, exceptId?: string) {
  return Object.keys(positions)
    .filter((id) => id !== exceptId && positions[id].pos === pos)
    .sort((a, b) => positions[a].spot - positions[b].spot);
}

/** A tapped lap space as a running position: the nearest one ahead, or a few spaces back for a spin-out. */
export function resolveTap(layout: TrackLayout, from: number, space: number) {
  const n = layout.spacesPerLap;
  let delta = (((space - lapSpace(layout, from)) % n) + n) % n;
  if (delta > n - MAX_BACKWARDS) delta -= n;
  return from + delta;
}

/**
 * Moves a car to `pos`. A car already there arrived first, so it keeps
 * (or takes) the racing-line spot and the newcomer goes beside it.
 * A car left alone in its old space slides onto the racing line.
 * Returns null when the space is full.
 */
export function placeCar(positions: Positions, id: string, pos: number): Positions | null {
  const there = carsAt(positions, pos, id);
  if (there.length >= 2) return null;
  const next: Positions = { ...positions, [id]: { pos, spot: there.length } };
  if (there.length === 1) next[there[0]] = { pos, spot: 0 };
  const from = positions[id];
  if (from && from.pos !== pos) {
    for (const [i, other] of carsAt(next, from.pos).entries()) next[other] = { pos: from.pos, spot: i };
  }
  return next;
}

/** Swaps the two cars sharing a space (for the odd spin-out that lands out of order). */
export function swapSpots(positions: Positions, pos: number): Positions {
  const there = carsAt(positions, pos);
  if (there.length !== 2) return positions;
  const [a, b] = there;
  return { ...positions, [a]: { pos, spot: 1 }, [b]: { pos, spot: 0 } };
}

/**
 * Classification so far: finished cars by the round they crossed the line,
 * then how far past it they got; everyone else by track position.
 */
export function classification(layout: TrackLayout, rounds: LoggedRound[]) {
  const last = rounds[rounds.length - 1]?.positions ?? {};
  const crossed = new Map<string, number>();
  rounds.forEach((round, r) => {
    for (const [id, car] of Object.entries(round.positions)) {
      if (!crossed.has(id) && isFinished(layout, car)) crossed.set(id, r);
    }
  });
  return Object.keys(last).sort((a, b) => {
    const ra = crossed.get(a) ?? Infinity;
    const rb = crossed.get(b) ?? Infinity;
    return ra - rb || compareCars(last[a], last[b]);
  });
}

/** Spaces each car moved in a round (negative after a spin-out). */
export function moves(before: Positions, after: Positions) {
  return Object.fromEntries(Object.keys(after).map((id) => [id, after[id].pos - (before[id]?.pos ?? after[id].pos)]));
}
