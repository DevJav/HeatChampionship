import { connection } from "next/server";
import { computeUnlocks } from "../achievements";
import { db } from "../db";
import { getStatsData } from "./stats";

/** Every achievement unlock (all seasons), plus the drivers involved. */
export async function getAchievements() {
  await connection();
  const [{ races, drivers }, seasons] = await Promise.all([
    getStatsData(),
    db.season.findMany({ select: { id: true, name: true, status: true } }),
  ]);
  const unlocks = computeUnlocks(
    races,
    seasons.map((s) => ({ id: s.id, name: s.name, finished: s.status === "FINISHED" })),
  );
  return { unlocks, drivers };
}
