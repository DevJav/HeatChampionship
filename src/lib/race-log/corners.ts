import { cornerOf, lapSpace, type TrackLayout } from "./layout";
import { rankHistory } from "./insights";
import { isFinished, type LoggedRound } from "./rounds";

/**
 * Where the action happened, corner by corner. Each corner owns the stretch
 * from its line to the next one (the finish straight belongs to the last).
 * Passes and slipstreams count where the car ended the round; a spin counts
 * against the corner ahead, since a spun car is put back behind its line.
 */

export type CornerStats = { passes: number; spins: number; slipstreams: number };

/** Index of the next corner line ahead of this lap space. */
export function cornerAhead(layout: TrackLayout, space: number) {
  const i = layout.corners.findIndex((c) => c.before > space);
  return i === -1 ? 0 : i;
}

export function cornerStats(layout: TrackLayout, rounds: LoggedRound[]): CornerStats[] {
  const stats = layout.corners.map(() => ({ passes: 0, spins: 0, slipstreams: 0 }));
  const ranks = rankHistory(layout, rounds);
  for (let r = 1; r < rounds.length; r++) {
    for (const [id, car] of Object.entries(rounds[r].positions)) {
      if (isFinished(layout, rounds[r - 1].positions[id])) continue;
      const space = lapSpace(layout, car.pos);
      const flags = rounds[r].flags[id];
      stats[cornerOf(layout, space)].passes += Math.max(0, ranks[r - 1][id] - ranks[r][id]);
      if (flags?.slipstream) stats[cornerOf(layout, space)].slipstreams++;
      if (flags?.spun) stats[cornerAhead(layout, space)].spins++;
    }
  }
  return stats;
}
