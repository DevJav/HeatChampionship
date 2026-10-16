/**
 * A driver's season in review ("Wrapped"): the numbers, their best day, who
 * beat them and who they beat, favourites, extras and badges. Built from the
 * season's finished races, so it works for the season in progress too.
 * Pure functions, unit-tested in wrapped.test.ts.
 */

import type { AchievementId, Unlock } from "./achievements";
import { podiumOf, scorePicks } from "./predictions";
import { positionsGained } from "./scoring";
import type { RaceRef, StatsRace } from "./stats";

/** A rivalry needs this many shared races to count */
const MIN_MEETINGS = 2;

type RaceMoment = { race: RaceRef; position: number; startPosition: number | null; field: number };
type Rival = { userId: string; times: number; meetings: number };

export type SeasonWrapped = {
  races: number;
  wins: number;
  podiums: number;
  points: number;
  rank: number | null;
  drivers: number;
  spins: number;
  /** Best finish; ties go to the one with more places gained */
  best: RaceMoment | null;
  /** Most places gained in a race (2 or more) */
  comeback: (RaceMoment & { gained: number }) | null;
  /** The rival who finished ahead most often */
  nemesis: Rival | null;
  /** The rival they finished ahead of most often */
  victim: Rival | null;
  favouriteColor: { name: string; hex: string; races: number } | null;
  /** Best average finish, among tracks raced twice or more when there are any */
  favouriteTrack: { name: string; average: number; races: number } | null;
  /** From races logged round by round */
  slipstreams: number | null;
  driverOfTheDay: number;
  predictions: { made: number; points: number } | null;
  badges: { id: AchievementId; count: number }[];
};

const refOf = (race: StatsRace): RaceRef => ({ id: race.id, round: race.round, seasonName: race.season.name, trackName: race.track.name });

/** `races`: the season's finished races; `standings`: its rows in order; `unlocks`: everyone's, any season. */
export function seasonWrapped(
  userId: string,
  races: StatsRace[],
  standings: { userId: string; points: number; rank: number }[],
  unlocks: Unlock[],
  seasonId: string,
): SeasonWrapped | null {
  const mine = races.flatMap((race) => {
    const result = race.results.find((r) => r.userId === userId);
    return result ? [{ race, result }] : [];
  });
  if (mine.length === 0) return null;

  const row = standings.find((s) => s.userId === userId);
  const moment = ({ race, result }: (typeof mine)[number]): RaceMoment => ({
    race: refOf(race),
    position: result.position,
    startPosition: result.startPosition,
    field: race.results.length,
  });
  const gained = (m: (typeof mine)[number]) => positionsGained(m.result.startPosition, m.result.position) ?? 0;

  const best = [...mine].sort((a, b) => a.result.position - b.result.position || gained(b) - gained(a))[0];
  const climb = [...mine].sort((a, b) => gained(b) - gained(a))[0];

  // Head to head against everyone they shared a race with
  const duels = new Map<string, { ahead: number; behind: number; meetings: number }>();
  for (const { race, result } of mine) {
    for (const other of race.results) {
      if (other.userId === userId) continue;
      const d = duels.get(other.userId) ?? { ahead: 0, behind: 0, meetings: 0 };
      d.meetings++;
      if (other.position < result.position) d.behind++;
      else d.ahead++;
      duels.set(other.userId, d);
    }
  }
  const rival = (count: (d: { ahead: number; behind: number }) => number): Rival | null => {
    const top = [...duels]
      .filter(([, d]) => d.meetings >= MIN_MEETINGS && count(d) > 0)
      .sort(([, a], [, b]) => count(b) / b.meetings - count(a) / a.meetings || count(b) - count(a))[0];
    return top ? { userId: top[0], times: count(top[1]), meetings: top[1].meetings } : null;
  };

  const colors = new Map<string, { name: string; hex: string; races: number }>();
  for (const { result } of mine) {
    if (!result.carColor) continue;
    const c = colors.get(result.carColor.id) ?? { name: result.carColor.name, hex: result.carColor.hex, races: 0 };
    c.races++;
    colors.set(result.carColor.id, c);
  }
  const tracks = new Map<string, { name: string; total: number; races: number }>();
  for (const { race, result } of mine) {
    const tr = tracks.get(race.track.id) ?? { name: race.track.name, total: 0, races: 0 };
    tr.total += result.position;
    tr.races++;
    tracks.set(race.track.id, tr);
  }
  // A single lucky race shouldn't beat a track raced again and again
  const averages = [...tracks.values()].map((tr) => ({ name: tr.name, average: tr.total / tr.races, races: tr.races }));
  const repeated = averages.filter((tr) => tr.races >= MIN_MEETINGS);
  const favouriteTrack = (repeated.length ? repeated : averages).sort((a, b) => a.average - b.average || b.races - a.races)[0];

  const logged = mine.filter(({ race }) => race.highlights);
  const predicted = races.flatMap((race) =>
    (race.predictions ?? []).filter((p) => p.userId === userId).map((p) => scorePicks(p.picks, podiumOf(race.results)).points),
  );

  const raceIds = new Set(races.map((race) => race.id));
  const counts = new Map<AchievementId, number>();
  for (const unlock of unlocks) {
    if (unlock.userId !== userId) continue;
    if (!(unlock.race && raceIds.has(unlock.race.id)) && unlock.season?.id !== seasonId) continue;
    counts.set(unlock.achievementId, (counts.get(unlock.achievementId) ?? 0) + 1);
  }

  return {
    races: mine.length,
    wins: mine.filter(({ result }) => result.position === 1).length,
    podiums: mine.filter(({ result }) => result.position <= 3).length,
    points: row?.points ?? mine.reduce((sum, { result }) => sum + result.points, 0),
    rank: row?.rank ?? null,
    drivers: standings.length,
    spins: mine.reduce((sum, { result }) => sum + result.spins, 0),
    best: moment(best),
    comeback: gained(climb) >= 2 ? { ...moment(climb), gained: gained(climb) } : null,
    nemesis: rival((d) => d.behind),
    victim: rival((d) => d.ahead),
    favouriteColor: [...colors.values()].sort((a, b) => b.races - a.races)[0] ?? null,
    favouriteTrack: favouriteTrack ?? null,
    slipstreams: logged.length ? logged.reduce((sum, { race }) => sum + (race.highlights!.slipstreams[userId] ?? 0), 0) : null,
    driverOfTheDay: mine.filter(({ race }) => race.driverOfTheDay?.includes(userId)).length,
    predictions: predicted.length ? { made: predicted.length, points: predicted.reduce((a, b) => a + b, 0) } : null,
    badges: [...counts].map(([id, count]) => ({ id, count })),
  };
}
