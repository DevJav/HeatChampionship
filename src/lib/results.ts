import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import type { ResultRow } from "./results-rules";
import { parsePointsTable, scoreRace } from "./scoring";

/** Results database operations. Points are stored on each result when saved. */

type Tx = Prisma.TransactionClient;

/** Replace a race's results, award points and mark it finished. */
export async function saveRaceResults(raceId: string, rows: ResultRow[]) {
  await db.$transaction(async (tx) => {
    const race = await tx.race.findUniqueOrThrow({
      where: { id: raceId },
      select: { season: { select: { pointsTable: true } } },
    });
    const points = scoreRace(rows, parsePointsTable(race.season.pointsTable));

    await tx.raceResult.deleteMany({ where: { raceId } });
    for (const row of rows) {
      await tx.raceResult.create({
        data: {
          raceId,
          userId: row.userId,
          position: row.position,
          dnf: row.position == null,
          startPosition: row.startPosition,
          carColorId: row.carColorId,
          notes: row.notes,
          points: points.get(row.userId) ?? 0,
          upgrades: { create: row.upgradeIds.map((upgradeId) => ({ upgradeId })) },
        },
      });
    }
    await tx.race.update({ where: { id: raceId }, data: { status: "FINISHED", finalizedAt: new Date() } });
  });
}

/** Remove results and reopen the race for editing (back to closed sign-ups). */
export async function clearRaceResults(raceId: string) {
  await db.$transaction(async (tx) => {
    await tx.raceResult.deleteMany({ where: { raceId } });
    await tx.race.update({ where: { id: raceId }, data: { status: "CLOSED", finalizedAt: null } });
  });
}

/** Re-score every finished race of a season (after its points table changes). */
export async function recomputeSeasonPoints(tx: Tx, seasonId: string) {
  const season = await tx.season.findUniqueOrThrow({ where: { id: seasonId }, select: { pointsTable: true } });
  const table = parsePointsTable(season.pointsTable);
  const results = await tx.raceResult.findMany({
    where: { race: { seasonId, status: "FINISHED" } },
    select: { id: true, userId: true, position: true, points: true },
  });
  for (const result of results) {
    const points = scoreRace([result], table).get(result.userId) ?? 0;
    if (points !== result.points) {
      await tx.raceResult.update({ where: { id: result.id }, data: { points } });
    }
  }
}
