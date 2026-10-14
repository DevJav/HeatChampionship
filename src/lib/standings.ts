/** Championship standings — pure functions, unit-tested in standings.test.ts. */

export type StandingsRace = {
  id: string;
  round: number;
  results: { userId: string; position: number; points: number }[];
};

export type StandingsRow = {
  userId: string;
  /** 1-based; fully tied drivers share a rank */
  rank: number;
  points: number;
  /** Points behind the leader */
  gap: number;
  wins: number;
  podiums: number;
  starts: number;
  /** Finishing position per race id (absent = didn't race) */
  positions: Record<string, number>;
  /** Points per race id */
  pointsByRace: Record<string, number>;
  /** Places gained (+) or lost (−) since before the latest race; null if not ranked then */
  movement: number | null;
};

type Tally = Omit<StandingsRow, "rank" | "gap" | "movement"> & {
  /** finishCounts[k] = times finished in position k+1 (for countback) */
  finishCounts: number[];
};

function tally(races: StandingsRace[]) {
  const byUser = new Map<string, Tally>();
  for (const race of races) {
    for (const result of race.results) {
      const row =
        byUser.get(result.userId) ??
        ({
          userId: result.userId,
          points: 0,
          wins: 0,
          podiums: 0,
          starts: 0,
          positions: {},
          pointsByRace: {},
          finishCounts: [],
        } satisfies Tally);
      row.points += result.points;
      row.starts += 1;
      row.positions[race.id] = result.position;
      row.pointsByRace[race.id] = result.points;
      if (result.position === 1) row.wins += 1;
      if (result.position <= 3) row.podiums += 1;
      row.finishCounts[result.position - 1] = (row.finishCounts[result.position - 1] ?? 0) + 1;
      byUser.set(result.userId, row);
    }
  }
  return [...byUser.values()];
}

/** Points, then countback (most wins, then most 2nds, …). 0 when fully tied. */
function compare(a: Tally, b: Tally) {
  if (a.points !== b.points) return b.points - a.points;
  const depth = Math.max(a.finishCounts.length, b.finishCounts.length);
  for (let i = 0; i < depth; i++) {
    const diff = (b.finishCounts[i] ?? 0) - (a.finishCounts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function rank(races: StandingsRace[]) {
  const sorted = tally(races).sort((a, b) => compare(a, b) || a.userId.localeCompare(b.userId));
  const ranks = new Map<string, number>();
  sorted.forEach((row, i) => {
    const previous = sorted[i - 1];
    ranks.set(row.userId, previous && compare(previous, row) === 0 ? ranks.get(previous.userId)! : i + 1);
  });
  return { sorted, ranks };
}

/** Season standings from its finished races (in round order). */
export function computeStandings(races: StandingsRace[]): StandingsRow[] {
  const ordered = [...races].sort((a, b) => a.round - b.round);
  const { sorted, ranks } = rank(ordered);
  const before = ordered.length > 1 ? rank(ordered.slice(0, -1)).ranks : null;
  const leaderPoints = sorted[0]?.points ?? 0;

  return sorted.map((tallied) => {
    const { finishCounts, ...row } = tallied;
    void finishCounts; // internal to countback, not part of the row
    const current = ranks.get(row.userId)!;
    const previous = before?.get(row.userId);
    return {
      ...row,
      rank: current,
      gap: leaderPoints - row.points,
      movement: previous == null ? null : previous - current,
    };
  });
}

/** Running points total per driver after each round, for the progression chart. */
export function pointsProgression(races: StandingsRace[], userIds: string[]) {
  const ordered = [...races].sort((a, b) => a.round - b.round);
  const totals = new Map(userIds.map((id) => [id, 0]));
  return ordered.map((race) => {
    for (const result of race.results) {
      if (totals.has(result.userId)) totals.set(result.userId, totals.get(result.userId)! + result.points);
    }
    return { raceId: race.id, round: race.round, totals: Object.fromEntries(totals) };
  });
}
