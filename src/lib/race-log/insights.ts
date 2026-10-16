import type { TrackLayout } from "./layout";
import { classification, isFinished, moves, type LoggedRound } from "./rounds";

/** Running order after each round (round 0 is the grid): car id → position, 1 = leader. */
export function rankHistory(layout: TrackLayout, rounds: LoggedRound[]) {
  return rounds.map((_, r) => {
    const order = classification(layout, rounds.slice(0, r + 1));
    return Object.fromEntries(order.map((id, i) => [id, i + 1])) as Record<string, number>;
  });
}

export type DriverInsight = {
  id: string;
  /** Places gained over the race, counting every pass (not just net) */
  overtakes: number;
  slipstreams: number;
  spins: number;
  /** Average spaces per round while racing */
  averageMove: number;
  bestMove: number;
  roundsLed: number;
};

export function driverInsights(layout: TrackLayout, rounds: LoggedRound[]): DriverInsight[] {
  const ranks = rankHistory(layout, rounds);
  const ids = Object.keys(rounds[0]?.positions ?? {});
  const finishedAt = new Map<string, number>();

  const stats = new Map(
    ids.map((id) => [id, { id, overtakes: 0, slipstreams: 0, spins: 0, averageMove: 0, bestMove: 0, roundsLed: 0 }]),
  );
  const moved = new Map(ids.map((id) => [id, [] as number[]]));

  for (let r = 1; r < rounds.length; r++) {
    const delta = moves(rounds[r - 1].positions, rounds[r].positions);
    for (const id of ids) {
      const s = stats.get(id)!;
      const flags = rounds[r].flags[id];
      if (flags?.slipstream) s.slipstreams++;
      if (flags?.spun) s.spins++;
      s.overtakes += Math.max(0, ranks[r - 1][id] - ranks[r][id]);
      if (ranks[r][id] === 1) s.roundsLed++;
      if (!finishedAt.has(id)) {
        moved.get(id)!.push(delta[id]);
        if (isFinished(layout, rounds[r].positions[id])) finishedAt.set(id, r);
      }
    }
  }

  for (const [id, list] of moved) {
    const s = stats.get(id)!;
    s.averageMove = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    s.bestMove = list.length ? Math.max(...list) : 0;
  }
  return [...stats.values()];
}
