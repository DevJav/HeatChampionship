import { lapSpace, type TrackLayout } from "./layout";
import { carsAt, placeCar, turnOrder, type LoggedRound, type Positions } from "./rounds";

/**
 * Plays a made-up round for demos: random speeds, the odd spin-out when a
 * car takes a corner far too fast, and slipstreams when it ends up next to
 * or right behind another car. Not a model of the real game.
 */
export function simulateRound(layout: TrackLayout, start: Positions, rand = Math.random): LoggedRound {
  let positions = { ...start };
  const flags: LoggedRound["flags"] = {};

  for (const id of turnOrder(layout, start)) {
    const from = positions[id].pos;
    const speed = 3 + Math.floor(rand() * 10);
    let target = from + speed;

    // First space past each corner line, ahead of the car
    const n = layout.spacesPerLap;
    const lineAhead = (before: number) => from + ((before - lapSpace(layout, from) + n) % n || n);
    const corner = layout.corners.find((c) => lineAhead(c.before) <= target);

    if (corner && speed > corner.limit + 4 && rand() < 0.15) {
      const line = lineAhead(corner.before);
      target = line - 1;
      flags[id] = { spun: true };
    } else if (carsAt(positions, target, id).length + carsAt(positions, target + 1, id).length > 0 && rand() < 0.7) {
      target += 2;
      flags[id] = { slipstream: true };
    }

    let placed = placeCar(positions, id, target);
    while (!placed) placed = placeCar(positions, id, --target);
    positions = placed;
  }

  return { positions, flags };
}
