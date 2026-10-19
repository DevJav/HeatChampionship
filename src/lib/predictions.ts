/**
 * Podium predictions: before a race starts, anyone in the league picks who
 * finishes 1st, 2nd and 3rd (racers included, themselves too). Everyone's
 * picks are public, and they can be changed until the start. Each pick scores PREDICTION_POINTS.exact for the
 * right place, PREDICTION_POINTS.podium for a podium finisher in another place.
 * Pure functions, unit-tested in predictions.test.ts.
 */

import { t } from "@/i18n";

export const PREDICTION_POINTS = { exact: 3, podium: 1 } as const;

/** 1st, 2nd and 3rd, as user ids */
export type Picks = [string, string, string];

export type PredictionRace = { status: string; scheduledAt: Date };

/** Predictions can be made or changed until the race starts. */
export function predictionsOpen(race: PredictionRace, now: Date) {
  return (race.status === "UPCOMING" || race.status === "OPEN" || race.status === "CLOSED") && now < race.scheduledAt;
}

/** The race has started: the picks are final. */
export function predictionsClosed(race: PredictionRace, now: Date) {
  return race.status === "FINISHED" || (race.status !== "DRAFT" && now >= race.scheduledAt);
}

export class PredictionError extends Error {}

/** Throws a PredictionError with a message for the user when the picks aren't valid. */
export function checkPicks(race: PredictionRace, entrantIds: string[], picks: string[], now: Date) {
  if (!predictionsOpen(race, now)) throw new PredictionError(t.predictions.errors.closed);
  if (picks.length !== 3 || picks.some((id) => !id)) throw new PredictionError(t.predictions.errors.pickThree);
  if (new Set(picks).size !== 3) throw new PredictionError(t.predictions.errors.different);
  if (picks.some((id) => !entrantIds.includes(id))) throw new PredictionError(t.predictions.errors.notEntered);
}

/** Points for a prediction against the official podium (user ids, 1st first). */
export function scorePicks(picks: Picks, podium: string[]) {
  let exact = 0;
  let onPodium = 0;
  picks.forEach((id, i) => {
    if (podium[i] === id) exact++;
    else if (podium.slice(0, 3).includes(id)) onPodium++;
  });
  return { points: exact * PREDICTION_POINTS.exact + onPodium * PREDICTION_POINTS.podium, exact, perfect: exact === 3 };
}

/** Podium of a finished race from its results. */
export function podiumOf(results: { userId: string; position: number }[]) {
  return [...results]
    .filter((r) => r.position <= 3)
    .sort((a, b) => a.position - b.position)
    .map((r) => r.userId);
}

export type PredictedRace = {
  results: { userId: string; position: number }[];
  predictions: { userId: string; picks: Picks }[];
};

export type OracleRow = { userId: string; predictions: number; points: number; exact: number; perfect: number; rank: number };

/** Season table of predictors: points, then exact picks; ties share the rank. */
export function oracleTable(races: PredictedRace[]): OracleRow[] {
  const rows = new Map<string, OracleRow>();
  for (const race of races) {
    const podium = podiumOf(race.results);
    for (const { userId, picks } of race.predictions) {
      const row = rows.get(userId) ?? { userId, predictions: 0, points: 0, exact: 0, perfect: 0, rank: 0 };
      const score = scorePicks(picks, podium);
      row.predictions++;
      row.points += score.points;
      row.exact += score.exact;
      if (score.perfect) row.perfect++;
      rows.set(userId, row);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => b.points - a.points || b.exact - a.exact);
  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    row.rank = prev && prev.points === row.points && prev.exact === row.exact ? prev.rank : i + 1;
  });
  return sorted;
}
