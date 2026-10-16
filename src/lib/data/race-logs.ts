import { connection } from "next/server";
import { db } from "../db";
import { parseRaceLog as parseLog, type DriverNames } from "../race-log/log";

async function namesOf(userIds: string[]): Promise<DriverNames> {
  const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  return Object.fromEntries(users.map((u) => [u.id, u.name]));
}

/** A race's log with the drivers' current names, or null if it was never logged. */
export async function getRaceLog(raceId: string) {
  await connection();
  const row = await db.raceLog.findUnique({ where: { raceId } });
  const log = row && parseLog(row.data);
  if (!log) return null;
  return { log, names: await namesOf(log.cars.map((c) => c.userId)), updatedAt: row.updatedAt };
}

/**
 * Everything the recorder page needs: the race and its track, the confirmed
 * drivers with their favourite colour (for the setup step), the colour
 * catalogue and the log so far.
 */
export async function getRaceLogEditorData(raceId: string) {
  await connection();
  const race = await db.race.findUnique({
    where: { id: raceId },
    include: {
      track: true,
      season: { select: { name: true } },
      registrations: {
        where: { status: "CONFIRMED" },
        orderBy: [{ queuedAt: "asc" }, { id: "asc" }],
        select: { user: { select: { id: true, name: true, favoriteColorId: true } } },
      },
      log: true,
    },
  });
  if (!race) return null;

  const carColors = await db.carColor.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, hex: true },
  });
  const log = race.log ? parseLog(race.log.data) : null;
  // Drivers in the log stay listed even if they withdrew afterwards
  const drivers = new Map(race.registrations.map(({ user }) => [user.id, user]));
  const missing = log?.cars.map((c) => c.userId).filter((id) => !drivers.has(id)) ?? [];
  if (missing.length) {
    const users = await db.user.findMany({ where: { id: { in: missing } }, select: { id: true, name: true, favoriteColorId: true } });
    for (const user of users) drivers.set(user.id, user);
  }

  return { race, drivers: [...drivers.values()], carColors, log };
}
