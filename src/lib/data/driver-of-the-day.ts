import { connection } from "next/server";
import { db } from "../db";

/** All Driver of the Day votes of a race. */
export async function getDotdVotes(raceId: string) {
  await connection();
  return db.driverOfTheDayVote.findMany({ where: { raceId }, select: { voterId: true, driverId: true } });
}
