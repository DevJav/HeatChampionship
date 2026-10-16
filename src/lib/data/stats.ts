import { connection } from "next/server";
import type { StatsRace } from "../stats";
import { db } from "../db";
import { raceHighlights } from "../race-log/highlights";
import { storedLog } from "../race-log/tracks";
import { driverSelect } from "./standings";

function highlightsOf(data: unknown) {
  const stored = storedLog(data);
  return stored && raceHighlights(stored.layout, stored.log.rounds);
}

/** Finished races with full results; all of them, or narrowed to a season and/or a track. */
export async function getStatsData({ seasonId, trackId }: { seasonId?: string | null; trackId?: string } = {}) {
  await connection();
  const races = await db.race.findMany({
    where: { status: "FINISHED", ...(seasonId ? { seasonId } : {}), ...(trackId ? { trackId } : {}) },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      round: true,
      scheduledAt: true,
      season: { select: { id: true, name: true } },
      track: { select: { id: true, name: true } },
      results: {
        select: {
          userId: true,
          position: true,
          spins: true,
          startPosition: true,
          points: true,
          carColor: { select: { id: true, name: true, hex: true } },
          upgrades: { select: { upgrade: { select: { id: true, name: true } } } },
        },
      },
      log: { select: { data: true } },
    },
  });
  const statsRaces: StatsRace[] = races.map(({ log, ...race }) => ({
    ...race,
    highlights: log && highlightsOf(log.data),
    results: race.results.map((result) => ({ ...result, upgrades: result.upgrades.map((u) => u.upgrade) })),
  }));

  const drivers = await db.user.findMany({
    where: { id: { in: [...new Set(races.flatMap((race) => race.results.map((r) => r.userId)))] } },
    select: driverSelect,
  });
  return { races: statsRaces, drivers: new Map(drivers.map((d) => [d.id, d])) };
}

export type StatsDriver = NonNullable<ReturnType<Awaited<ReturnType<typeof getStatsData>>["drivers"]["get"]>>;
