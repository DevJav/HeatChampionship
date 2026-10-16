import { connection } from "next/server";
import { db } from "../db";
import { oracleTable, type Picks } from "../predictions";
import { driverSelect } from "./standings";

const asPicks = (p: { firstId: string; secondId: string; thirdId: string }): Picks => [p.firstId, p.secondId, p.thirdId];

/** Every prediction for a race, with who made it and the picked drivers' names. */
export async function getRacePredictions(raceId: string) {
  await connection();
  const rows = await db.prediction.findMany({
    where: { raceId },
    orderBy: { createdAt: "asc" },
    select: {
      firstId: true,
      secondId: true,
      thirdId: true,
      user: { select: driverSelect },
      first: { select: { name: true } },
      second: { select: { name: true } },
      third: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    user: row.user,
    picks: asPicks(row),
    names: [row.first.name, row.second.name, row.third.name] as [string, string, string],
  }));
}

export type RacePrediction = Awaited<ReturnType<typeof getRacePredictions>>[number];

/** The season's predictors table over its finished races, plus the people in it. */
export async function getSeasonOracle(seasonId: string) {
  await connection();
  const races = await db.race.findMany({
    where: { seasonId, status: "FINISHED" },
    select: {
      results: { select: { userId: true, position: true } },
      predictions: { select: { userId: true, firstId: true, secondId: true, thirdId: true } },
    },
  });
  const rows = oracleTable(races.map((race) => ({ results: race.results, predictions: race.predictions.map((p) => ({ userId: p.userId, picks: asPicks(p) })) })));
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: driverSelect });
  return { rows, users: new Map(users.map((u) => [u.id, u])) };
}
