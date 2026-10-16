import type { TrackLayout } from "./layout";
import { rankHistory } from "./insights";
import { classification, isFinished, type LoggedRound } from "./rounds";

/**
 * Story beats of a logged race, for achievements and the race page.
 * Pure functions over the closed rounds; round 0 is the grid.
 */

/** A one-round climb is only a "moment" if it gains at least this many places. */
export const MOMENT_MIN_PLACES = 2;

export type Moment = { userId: string; round: number; from: number; to: number };

/** Round in which each car first crossed the finish line. */
function finishRounds(layout: TrackLayout, rounds: LoggedRound[]) {
  const crossed = new Map<string, number>();
  rounds.forEach((round, r) => {
    for (const [id, car] of Object.entries(round.positions)) {
      if (!crossed.has(id) && isFinished(layout, car)) crossed.set(id, r);
    }
  });
  return crossed;
}

function isComplete(layout: TrackLayout, rounds: LoggedRound[]) {
  const last = rounds[rounds.length - 1]?.positions ?? {};
  return rounds.length > 1 && Object.values(last).every((car) => isFinished(layout, car));
}

/**
 * The biggest climb up the running order in a single round. Ties go to the
 * later round, which is closer to the flag. Null if nobody gained enough.
 */
export function momentOfTheRace(layout: TrackLayout, rounds: LoggedRound[]): Moment | null {
  const ranks = rankHistory(layout, rounds);
  let best: Moment | null = null;
  for (let r = 1; r < rounds.length; r++) {
    for (const id of Object.keys(ranks[r])) {
      const from = ranks[r - 1][id];
      const to = ranks[r][id];
      const gain = from - to;
      if (gain >= MOMENT_MIN_PLACES && (!best || gain >= best.from - best.to)) best = { userId: id, round: r, from, to };
    }
  }
  return best;
}

export type RaceHighlights = {
  /** Winner on the log, null until every car is home */
  winner: string | null;
  /** The winner led at the end of every round */
  wireToWire: boolean;
  /** The winner was not leading the round before they crossed the line */
  lastGasp: boolean;
  /** Slipstreams per car */
  slipstreams: Record<string, number>;
};

export function raceHighlights(layout: TrackLayout, rounds: LoggedRound[]): RaceHighlights {
  const slipstreams: Record<string, number> = {};
  for (const round of rounds) {
    for (const [id, flags] of Object.entries(round.flags)) if (flags.slipstream) slipstreams[id] = (slipstreams[id] ?? 0) + 1;
  }
  if (!isComplete(layout, rounds)) return { winner: null, wireToWire: false, lastGasp: false, slipstreams };

  const ranks = rankHistory(layout, rounds);
  const winner = classification(layout, rounds)[0];
  const crossedAt = finishRounds(layout, rounds).get(winner)!;
  return {
    winner,
    wireToWire: ranks.slice(1).every((round) => round[winner] === 1),
    lastGasp: crossedAt >= 2 && ranks[crossedAt - 1][winner] > 1,
    slipstreams,
  };
}
