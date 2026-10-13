/** Per-player statistics — pure functions, unit-tested in player-stats.test.ts. */

import { positionsGained } from "./scoring";

export type PlayerResult = {
  raceId: string;
  scheduledAt: Date;
  trackId: string;
  trackName: string;
  position: number | null;
  startPosition: number | null;
  points: number;
};

export type PlayerSummary = {
  starts: number;
  wins: number;
  podiums: number;
  dnfs: number;
  points: number;
  /** Average finishing position of races finished (retirements excluded) */
  averageFinish: number | null;
  bestFinish: number | null;
  /** Average places gained from the grid, where the grid was recorded */
  averageGained: number | null;
  /** Last results, most recent first (null = retired) */
  form: (number | null)[];
  /** Track with the best average finish */
  bestTrack: { trackId: string; trackName: string; averageFinish: number; starts: number } | null;
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

export function summarizePlayer(results: PlayerResult[], formLength = 5): PlayerSummary {
  const finished = results.filter((r) => r.position != null);
  const finishes = finished.map((r) => r.position!);
  const gains = results
    .map((r) => positionsGained(r.startPosition, r.position))
    .filter((g): g is number => g != null);

  const byTrack = new Map<string, { trackName: string; finishes: number[]; starts: number }>();
  for (const r of results) {
    const entry = byTrack.get(r.trackId) ?? { trackName: r.trackName, finishes: [], starts: 0 };
    entry.starts += 1;
    if (r.position != null) entry.finishes.push(r.position);
    byTrack.set(r.trackId, entry);
  }
  const bestTrack =
    [...byTrack.entries()]
      .filter(([, t]) => t.finishes.length > 0)
      .map(([trackId, t]) => ({ trackId, trackName: t.trackName, averageFinish: average(t.finishes)!, starts: t.starts }))
      .sort((a, b) => a.averageFinish - b.averageFinish || b.starts - a.starts)[0] ?? null;

  return {
    starts: results.length,
    wins: finishes.filter((p) => p === 1).length,
    podiums: finishes.filter((p) => p <= 3).length,
    dnfs: results.length - finished.length,
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
