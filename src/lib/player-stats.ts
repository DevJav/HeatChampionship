/** Per-player statistics — pure functions, unit-tested in player-stats.test.ts. */

import { positionsGained } from "./scoring";

export type PlayerResult = {
  raceId: string;
  scheduledAt: Date;
  trackId: string;
  trackName: string;
  position: number;
  spins: number;
  startPosition: number | null;
  points: number;
};

export type PlayerSummary = {
  starts: number;
  wins: number;
  podiums: number;
  /** Spin-outs (trompos), all races */
  spins: number;
  points: number;
  averageFinish: number | null;
  bestFinish: number | null;
  /** Average places gained from the grid, where the grid was recorded */
  averageGained: number | null;
  /** Last results, most recent first */
  form: number[];
  /** Track with the best average finish */
  bestTrack: { trackId: string; trackName: string; averageFinish: number; starts: number } | null;
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

export function summarizePlayer(results: PlayerResult[], formLength = 5): PlayerSummary {
  const finishes = results.map((r) => r.position);
  const gains = results
    .map((r) => positionsGained(r.startPosition, r.position))
    .filter((g): g is number => g != null);

  const byTrack = new Map<string, { trackName: string; finishes: number[] }>();
  for (const r of results) {
    const entry = byTrack.get(r.trackId) ?? { trackName: r.trackName, finishes: [] };
    entry.finishes.push(r.position);
    byTrack.set(r.trackId, entry);
  }
  const bestTrack =
    [...byTrack.entries()]
      .map(([trackId, t]) => ({ trackId, trackName: t.trackName, averageFinish: average(t.finishes)!, starts: t.finishes.length }))
      .sort((a, b) => a.averageFinish - b.averageFinish || b.starts - a.starts)[0] ?? null;

  return {
    starts: results.length,
    wins: finishes.filter((p) => p === 1).length,
    podiums: finishes.filter((p) => p <= 3).length,
    spins: results.reduce((sum, r) => sum + r.spins, 0),
    points: results.reduce((sum, r) => sum + r.points, 0),
    averageFinish: average(finishes),
    bestFinish: finishes.length ? Math.min(...finishes) : null,
    averageGained: average(gains),
    form: [...results]
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
      .slice(0, formLength)
      .map((r) => r.position),
    bestTrack,
  };
}
