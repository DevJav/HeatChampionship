/** Championship statistics — pure functions, unit-tested in stats.test.ts. */

import { intlLocale, t } from "@/i18n";
import { summarizePlayer, type PlayerResult, type PlayerSummary } from "./player-stats";
import { positionsGained } from "./scoring";
import type { RaceHighlights } from "./race-log/highlights";

export type StatsResult = {
  userId: string;
  position: number;
  /** Spin-outs (trompos) */
  spins: number;
  startPosition: number | null;
  points: number;
  carColor: { id: string; name: string; hex: string } | null;
  upgrades: { id: string; name: string }[];
};

export type StatsRace = {
  id: string;
  round: number;
  scheduledAt: Date;
  season: { id: string; name: string };
  track: { id: string; name: string };
  results: StatsResult[];
  /** Story beats from the round-by-round log, when the race was logged on a traced track */
  highlights?: RaceHighlights | null;
};

/** Where a single-race record happened. */
export type RaceRef = { id: string; round: number; seasonName: string; trackName: string };

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

const raceRef = (race: StatsRace): RaceRef => ({
  id: race.id,
  round: race.round,
  seasonName: race.season.name,
  trackName: race.track.name,
});

/** Every item sharing the best value (highest unless `lowest`). */
function leaders<T>(items: T[], value: (item: T) => number | null, { lowest = false } = {}) {
  const scored = items.map((item) => ({ item, value: value(item) })).filter((s) => s.value != null);
  if (scored.length === 0) return null;
  const best = lowest ? Math.min(...scored.map((s) => s.value!)) : Math.max(...scored.map((s) => s.value!));
  return { value: best, items: scored.filter((s) => s.value === best).map((s) => s.item) };
}

/** Races in chronological order. */
const chronological = (races: StatsRace[]) =>
  [...races].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

/** Each driver's results, oldest first. */
function resultsByDriver(races: StatsRace[]) {
  const byUser = new Map<string, { race: StatsRace; result: StatsResult }[]>();
  for (const race of chronological(races)) {
    for (const result of race.results) {
      const list = byUser.get(result.userId) ?? [];
      list.push({ race, result });
      byUser.set(result.userId, list);
    }
  }
  return byUser;
}

/** Minimum starts for average-based rankings: a third of the races, at least 2. */
export function qualifyingStarts(raceCount: number) {
  return Math.max(2, Math.ceil(raceCount / 3));
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

export type DriverStats = PlayerSummary & {
  userId: string;
  pointsPerRace: number;
  winRate: number;
  podiumRate: number;
};

/** Career numbers per driver, best points-per-race first. */
export function driverStats(races: StatsRace[]): DriverStats[] {
  return [...resultsByDriver(races)]
    .map(([userId, entries]) => {
      const results: PlayerResult[] = entries.map(({ race, result }) => ({
        raceId: race.id,
        scheduledAt: race.scheduledAt,
        trackId: race.track.id,
        trackName: race.track.name,
        position: result.position,
        spins: result.spins,
        startPosition: result.startPosition,
        points: result.points,
      }));
      const summary = summarizePlayer(results);
      return {
        ...summary,
        userId,
        pointsPerRace: summary.points / summary.starts,
        winRate: summary.wins / summary.starts,
        podiumRate: summary.podiums / summary.starts,
      };
    })
    .sort((a, b) => b.pointsPerRace - a.pointsPerRace || b.starts - a.starts);
}

/** Entrants' record over a set of races (e.g. one track): best average finish first, debutants last. */
export function entrantRecords(races: StatsRace[], entrantIds: string[]) {
  const byId = new Map(driverStats(races).map((d) => [d.userId, d]));
  const sortKey = (stats: DriverStats | null) =>
    !stats ? [1, 0, 0, 0] : [0, stats.averageFinish!, -stats.wins, -stats.starts];
  return entrantIds
    .map((userId) => ({ userId, stats: byId.get(userId) ?? null }))
    .sort((a, b) => {
      const [ka, kb] = [sortKey(a.stats), sortKey(b.stats)];
      return ka.map((v, i) => v - kb[i]).find((d) => d !== 0) ?? 0;
    });
}

/** Races newest first, each with its podium (user ids, null where the field was smaller). */
export function raceHistory(races: StatsRace[]) {
  return chronological(races)
    .reverse()
    .map((race) => ({
      race: raceRef(race),
      scheduledAt: race.scheduledAt,
      podium: [1, 2, 3].map((p) => race.results.find((r) => r.position === p)?.userId ?? null),
    }));
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export type RecordHolder = {
  userId: string;
  /** The race where it happened, for single-race records */
  race?: RaceRef;
  /** For streaks: still running after the driver's latest race */
  ongoing?: boolean;
  /** Extra context, e.g. "Salió 7º, llegó 1º" */
  detail?: string;
};

export type ChampionshipRecord = { value: number; holders: RecordHolder[] };

/** Longest run of consecutive starts (races the driver took part in) meeting `hit`. */
function longestStreak(entries: { result: StatsResult }[], hit: (r: StatsResult) => boolean) {
  let best = 0;
  let current = 0;
  for (const { result } of entries) {
    current = hit(result) ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { best, ongoing: best > 0 && current === best };
}

function streakRecord(races: StatsRace[], hit: (r: StatsResult) => boolean): ChampionshipRecord | null {
  const streaks = [...resultsByDriver(races)].map(([userId, entries]) => ({ userId, ...longestStreak(entries, hit) }));
  const top = leaders(streaks, (s) => (s.best > 0 ? s.best : null));
  return top && { value: top.value, holders: top.items.map(({ userId, ongoing }) => ({ userId, ongoing })) };
}

function totalRecord(drivers: DriverStats[], value: (d: DriverStats) => number | null, options?: { lowest?: boolean }) {
  const top = leaders(drivers, value, options);
  return top && { value: top.value, holders: top.items.map((d) => ({ userId: d.userId })) };
}

export function championshipRecords(races: StatsRace[]) {
  const drivers = driverStats(races);
  const minStarts = qualifyingStarts(races.length);
  const results = races.flatMap((race) => race.results.map((result) => ({ race, result })));

  const comeback = leaders(results, ({ result }) => {
    const gained = positionsGained(result.startPosition, result.position);
    return gained != null && gained > 0 ? gained : null;
  });
  const winners = results.filter(({ result }) => result.position === 1);
  const furthestBack = leaders(winners, ({ result }) => result.startPosition);

  return {
    mostWins: totalRecord(drivers, (d) => d.wins || null),
    mostPodiums: totalRecord(drivers, (d) => d.podiums || null),
    mostPoints: totalRecord(drivers, (d) => d.points || null),
    mostStarts: totalRecord(drivers, (d) => d.starts),
    mostSpins: totalRecord(drivers, (d) => d.spins || null),
    bestAverageFinish: totalRecord(drivers, (d) => (d.starts >= minStarts ? d.averageFinish : null), { lowest: true }),
    winStreak: streakRecord(races, (r) => r.position === 1),
    podiumStreak: streakRecord(races, (r) => r.position <= 3),
    biggestComeback: comeback && {
      value: comeback.value,
      holders: comeback.items.map(({ race, result }) => ({
        userId: result.userId,
        race: raceRef(race),
        detail: t.achievements.startedFinished(t.common.ordinal(result.startPosition!), t.common.ordinal(result.position)),
      })),
    },
    winFromFurthestBack: furthestBack && {
      value: furthestBack.value,
      holders: furthestBack.items.map(({ race, result }) => ({ userId: result.userId, race: raceRef(race) })),
    },
    /** Starts needed to rank in bestAverageFinish */
    minStarts,
  };
}

export type ChampionshipRecords = ReturnType<typeof championshipRecords>;

// ---------------------------------------------------------------------------
// Head to head
// ---------------------------------------------------------------------------

export type Duel = {
  /** Races both drivers took part in */
  meetings: number;
  /** Races the row driver finished ahead */
  ahead: number;
  behind: number;
};

/** duels.get(a)?.get(b) = how `a` fared against `b` in races they shared. */
export function headToHead(races: StatsRace[]) {
  const duels = new Map<string, Map<string, Duel>>();
  const duel = (a: string, b: string) => {
    const row = duels.get(a) ?? new Map<string, Duel>();
    duels.set(a, row);
    const entry = row.get(b) ?? { meetings: 0, ahead: 0, behind: 0 };
    row.set(b, entry);
    return entry;
  };
  for (const race of races) {
    for (const a of race.results) {
      for (const b of race.results) {
        if (a.userId === b.userId) continue;
        const entry = duel(a.userId, b.userId);
        entry.meetings += 1;
        if (a.position < b.position) entry.ahead += 1;
        else entry.behind += 1;
      }
    }
  }
  return duels;
}

/**
 * Diverging step for a duel, −3 (nearly always behind) … 0 (even) … +3 (nearly always ahead).
 * Equal-width bands of the share of races finished ahead.
 */
export function duelStep({ meetings, ahead }: Duel) {
  if (meetings === 0) return 0;
  const lead = ahead / meetings - 0.5;
  const band = Math.abs(lead) <= 0.05 ? 0 : Math.abs(lead) <= 0.2 ? 1 : Math.abs(lead) <= 0.35 ? 2 : 3;
  return band === 0 ? 0 : Math.sign(lead) * band;
}

// ---------------------------------------------------------------------------
// Tracks, cars, upgrades, grid
// ---------------------------------------------------------------------------

export type TrackStats = {
  trackId: string;
  trackName: string;
  races: number;
  averageField: number;
  /** Drivers with the most wins on the track */
  topWinners: { userIds: string[]; wins: number } | null;
  lastWinnerId: string | null;
};

export function trackStats(races: StatsRace[]): TrackStats[] {
  const byTrack = new Map<string, StatsRace[]>();
  for (const race of chronological(races)) {
    byTrack.set(race.track.id, [...(byTrack.get(race.track.id) ?? []), race]);
  }
  return [...byTrack.values()]
    .map((list) => {
      const winners = list.flatMap((race) => race.results.filter((r) => r.position === 1).map((r) => r.userId));
      const winCounts = [...new Set(winners)].map((userId) => ({
        userId,
        wins: winners.filter((w) => w === userId).length,
      }));
      const top = leaders(winCounts, (w) => w.wins);
      return {
        trackId: list[0].track.id,
        trackName: list[0].track.name,
        races: list.length,
        averageField: average(list.map((race) => race.results.length)) ?? 0,
        topWinners: top && { userIds: top.items.map((w) => w.userId), wins: top.value },
        lastWinnerId: winners.at(-1) ?? null,
      };
    })
    .sort((a, b) => b.races - a.races || a.trackName.localeCompare(b.trackName, intlLocale));
}

/** Outcome tally for anything a result can carry (a car color, an upgrade, a grid slot). */
export type Tally = {
  uses: number;
  wins: number;
  podiums: number;
  winRate: number;
  averageFinish: number | null;
};

function tallyResults(results: StatsResult[]): Tally {
  const finishes = results.map((r) => r.position);
  const wins = finishes.filter((p) => p === 1).length;
  return {
    uses: results.length,
    wins,
    podiums: finishes.filter((p) => p <= 3).length,
    winRate: results.length ? wins / results.length : 0,
    averageFinish: average(finishes),
  };
}

function groupResults<K, M>(races: StatsRace[], keysOf: (r: StatsResult) => { key: K; meta: M }[]) {
  const groups = new Map<K, { meta: M; results: StatsResult[] }>();
  for (const result of races.flatMap((race) => race.results)) {
    for (const { key, meta } of keysOf(result)) {
      const group = groups.get(key) ?? { meta, results: [] };
      group.results.push(result);
      groups.set(key, group);
    }
  }
  return [...groups.values()].map(({ meta, results }) => ({ ...meta, ...tallyResults(results) }));
}

const byUsage = (a: Tally, b: Tally) => b.uses - a.uses || b.winRate - a.winRate;

export function carColorStats(races: StatsRace[]) {
  return groupResults(races, (r) => (r.carColor ? [{ key: r.carColor.id, meta: { color: r.carColor } }] : [])).sort(
    byUsage,
  );
}

export function upgradeStats(races: StatsRace[]) {
  return groupResults(races, (r) => r.upgrades.map((upgrade) => ({ key: upgrade.id, meta: { upgrade } }))).sort(
    byUsage,
  );
}

/** Outcomes by starting slot, front of the grid first; every slot up to the furthest one used. */
export function gridStats(races: StatsRace[]) {
  const slots = groupResults(races, (r) =>
    r.startPosition != null ? [{ key: r.startPosition, meta: { startPosition: r.startPosition } }] : [],
  );
  const furthest = Math.max(0, ...slots.map((s) => s.startPosition));
  return Array.from(
    { length: furthest },
    (_, i) => slots.find((s) => s.startPosition === i + 1) ?? { startPosition: i + 1, ...tallyResults([]) },
  );
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const plain = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/gi, "")
    .toUpperCase();

/**
 * Broadcast-style three-letter codes (ANA, MAR…), unique within the list.
 * Clashes fall back to first two letters + last letter, then a digit.
 */
export function driverCodes(drivers: { id: string; name: string }[]) {
  const codes = new Map<string, string>();
  const used = new Set<string>();
  for (const driver of drivers) {
    const letters = plain(driver.name).padEnd(3, "X");
    const candidates = [letters.slice(0, 3), letters.slice(0, 2) + letters.at(-1)];
    let code = candidates.find((c) => !used.has(c));
    for (let n = 2; !code; n++) {
      if (!used.has(letters.slice(0, 2) + n)) code = letters.slice(0, 2) + n;
    }
    used.add(code);
    codes.set(driver.id, code);
  }
  return codes;
}
