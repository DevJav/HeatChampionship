import { connection } from "next/server";
import { computeStandings, pointsProgression } from "../standings";
import { db } from "../db";

export const driverSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  favoriteColor: { select: { name: true, hex: true } },
} as const;

/** Standings, finished races and drivers of a season. */
export async function getSeasonStandings(seasonId: string) {
  await connection();
  const races = await db.race.findMany({
    where: { seasonId, status: "FINISHED" },
    orderBy: { round: "asc" },
    select: {
      id: true,
      round: true,
      scheduledAt: true,
      track: { select: { name: true } },
      results: { select: { userId: true, position: true, points: true } },
    },
  });
  const rows = computeStandings(races);
  const scheduledRaces = await db.race.count({ where: { seasonId, status: { not: "DRAFT" } } });
  const drivers = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: driverSelect,
  });
  return {
    races,
    rows,
    /** Published races in the season, finished or not */
    scheduledRaces,
    drivers: new Map(drivers.map((d) => [d.id, d])),
    progression: pointsProgression(
      races,
      rows.map((r) => r.userId),
    ),
  };
}

export type SeasonStandings = Awaited<ReturnType<typeof getSeasonStandings>>;
