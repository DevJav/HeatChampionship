/**
 * Prizes and achievements, derived from finished races — nothing is stored.
 * Pure functions, unit-tested in achievements.test.ts.
 */

import { positionsGained } from "./scoring";
import { computeStandings } from "./standings";
import type { RaceRef, StatsRace } from "./stats";

export type AchievementTier = "gold" | "silver" | "bronze" | "special" | "common";

export type AchievementId =
  | "champion"
  | "runner-up"
  | "third"
  | "first-race"
  | "first-podium"
  | "first-win"
  | "from-the-back"
  | "comeback"
  | "pole-to-win"
  | "hat-trick"
  | "podium-streak"
  | "globetrotter"
  | "ironman"
  | "veteran"
  | "legend"
  | "spin";

export type AchievementDefinition = {
  id: AchievementId;
  name: string;
  description: string;
  tier: AchievementTier;
  /** Season trophies are shown apart from the badges */
  trophy?: boolean;
  /** Can be earned more than once */
  repeatable?: boolean;
};

export const COMEBACK_PLACES = 4;
export const HAT_TRICK_WINS = 3;
export const PODIUM_STREAK = 5;
export const GLOBETROTTER_TRACKS = 3;
export const VETERAN_STARTS = 10;
export const LEGEND_STARTS = 25;
/** "Desde el fondo" needs a real grid behind you */
const FROM_THE_BACK_MIN_FIELD = 3;
/** "Incansable" only counts seasons with a few races */
const IRONMAN_MIN_RACES = 3;

/** Every achievement, in display order. */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "champion", name: "Campeón", description: "Ganó una temporada.", tier: "gold", trophy: true, repeatable: true },
  { id: "runner-up", name: "Subcampeón", description: "Segundo en una temporada.", tier: "silver", trophy: true, repeatable: true },
  { id: "third", name: "Tercero", description: "Tercero en una temporada.", tier: "bronze", trophy: true, repeatable: true },
  { id: "from-the-back", name: "Desde el fondo", description: "Ganó saliendo el último de la parrilla.", tier: "special", repeatable: true },
  { id: "hat-trick", name: "Hat-trick", description: `${HAT_TRICK_WINS} victorias seguidas.`, tier: "special", repeatable: true },
  { id: "podium-streak", name: "Fijo en el podio", description: `${PODIUM_STREAK} podios seguidos.`, tier: "special", repeatable: true },
  { id: "comeback", name: "Remontada", description: `Ganó ${COMEBACK_PLACES} o más posiciones en una carrera.`, tier: "special", repeatable: true },
  { id: "pole-to-win", name: "De principio a fin", description: "Ganó saliendo primero.", tier: "special", repeatable: true },
  { id: "globetrotter", name: "Trotamundos", description: `Ganó en ${GLOBETROTTER_TRACKS} circuitos distintos.`, tier: "special" },
  { id: "ironman", name: "Incansable", description: "Corrió todas las carreras de una temporada.", tier: "special", repeatable: true },
  { id: "first-win", name: "Primera victoria", description: "Ganó su primera carrera.", tier: "common" },
  { id: "first-podium", name: "Primer podio", description: "Subió al podio por primera vez.", tier: "common" },
  { id: "first-race", name: "Debut", description: "Corrió su primera carrera.", tier: "common" },
  { id: "veteran", name: "Veterano", description: `${VETERAN_STARTS} carreras disputadas.`, tier: "common" },
  { id: "legend", name: "Leyenda", description: `${LEGEND_STARTS} carreras disputadas.`, tier: "special" },
  { id: "spin", name: "Trompo", description: "Su primer abandono. Le pasa a cualquiera.", tier: "common" },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** One time a driver earned an achievement. */
export type Unlock = {
  achievementId: AchievementId;
  userId: string;
  date: Date;
  /** The race it happened in (race achievements) */
  race?: RaceRef;
  /** The season it was earned in (trophies, Incansable) */
  season?: { id: string; name: string };
};

export type SeasonInfo = { id: string; name: string; finished: boolean };

const raceRef = (race: StatsRace): RaceRef => ({
  id: race.id,
  round: race.round,
  seasonName: race.season.name,
  trackName: race.track.name,
});

/** Every unlock, oldest first. `races` are finished races of any season. */
export function computeUnlocks(races: StatsRace[], seasons: SeasonInfo[]): Unlock[] {
  const ordered = [...races].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const unlocks: Unlock[] = [];

  // --- Race by race, per driver
  type Career = { starts: number; wins: number; podiums: number; dnfs: number; winStreak: number; podiumStreak: number; winTracks: Set<string> };
  const careers = new Map<string, Career>();

  for (const race of ordered) {
    const add = (achievementId: AchievementId, userId: string) =>
      unlocks.push({ achievementId, userId, date: race.scheduledAt, race: raceRef(race) });
    const lastGridSlot = Math.max(0, ...race.results.map((r) => r.startPosition ?? 0));

    for (const result of race.results) {
      const c =
        careers.get(result.userId) ??
        { starts: 0, wins: 0, podiums: 0, dnfs: 0, winStreak: 0, podiumStreak: 0, winTracks: new Set<string>() };
      careers.set(result.userId, c);
      const { userId, position, startPosition } = result;

      c.starts += 1;
      if (c.starts === 1) add("first-race", userId);
      if (c.starts === VETERAN_STARTS) add("veteran", userId);
      if (c.starts === LEGEND_STARTS) add("legend", userId);

      if (position == null) {
        c.dnfs += 1;
        if (c.dnfs === 1) add("spin", userId);
      }

      const won = position === 1;
      c.winStreak = won ? c.winStreak + 1 : 0;
      if (won) {
        c.wins += 1;
        if (c.wins === 1) add("first-win", userId);
        if (c.winStreak === HAT_TRICK_WINS) add("hat-trick", userId);
        if (startPosition === 1) add("pole-to-win", userId);
        if (startPosition != null && startPosition === lastGridSlot && lastGridSlot >= FROM_THE_BACK_MIN_FIELD) {
          add("from-the-back", userId);
        }
        const before = c.winTracks.size;
        c.winTracks.add(race.track.id);
        if (before < GLOBETROTTER_TRACKS && c.winTracks.size === GLOBETROTTER_TRACKS) add("globetrotter", userId);
      }

      const podium = position != null && position <= 3;
      c.podiumStreak = podium ? c.podiumStreak + 1 : 0;
      if (podium) {
        c.podiums += 1;
        if (c.podiums === 1) add("first-podium", userId);
        if (c.podiumStreak === PODIUM_STREAK) add("podium-streak", userId);
      }

      const gained = positionsGained(startPosition, position);
      if (gained != null && gained >= COMEBACK_PLACES) add("comeback", userId);
    }
  }

  // --- Finished seasons: final top three and full attendance
  const trophies: AchievementId[] = ["champion", "runner-up", "third"];
  for (const season of seasons.filter((s) => s.finished)) {
    const seasonRaces = ordered.filter((race) => race.season.id === season.id);
    if (seasonRaces.length === 0) continue;
    const date = seasonRaces[seasonRaces.length - 1].scheduledAt;
    const ref = { id: season.id, name: season.name };

    for (const row of computeStandings(seasonRaces)) {
      if (row.rank <= 3) unlocks.push({ achievementId: trophies[row.rank - 1], userId: row.userId, date, season: ref });
      if (seasonRaces.length >= IRONMAN_MIN_RACES && row.starts === seasonRaces.length) {
        unlocks.push({ achievementId: "ironman", userId: row.userId, date, season: ref });
      }
    }
  }

  return unlocks.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type Award = {
  achievement: AchievementDefinition;
  /** Oldest first */
  unlocks: Unlock[];
};

/** A driver's achievements in catalog order: earned ones with their unlocks, the rest with none. */
export function awardsFor(userId: string, unlocks: Unlock[]): Award[] {
  const mine = unlocks.filter((u) => u.userId === userId);
  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    unlocks: mine.filter((u) => u.achievementId === achievement.id),
  }));
}

/** Season podiums (finished seasons), newest season first. */
export function seasonPodiums(unlocks: Unlock[]) {
  const bySeason = new Map<string, { season: { id: string; name: string }; date: Date; places: Record<1 | 2 | 3, string[]> }>();
  const place = { champion: 1, "runner-up": 2, third: 3 } as const;
  for (const unlock of unlocks) {
    if (!unlock.season || !(unlock.achievementId in place)) continue;
    const entry =
      bySeason.get(unlock.season.id) ?? { season: unlock.season, date: unlock.date, places: { 1: [], 2: [], 3: [] } };
    entry.places[place[unlock.achievementId as keyof typeof place]].push(unlock.userId);
    bySeason.set(unlock.season.id, entry);
  }
  return [...bySeason.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}
