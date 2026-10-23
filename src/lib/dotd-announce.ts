import { db } from "./db";
import { DOTD_VOTING_DAYS, tallyVotes } from "./driver-of-the-day";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Announces Driver of the Day votes that have closed: a feed entry per
 * winner and a notification to each of the race's drivers. There's no
 * scheduler, so this runs after ordinary page loads (see `after()` callers)
 * and when an admin closes a vote early;
 * claiming each race with `dotdAnnouncedAt` first makes it happen once, even
 * with requests racing. Closed votes without any votes are just marked.
 */
export async function announceDriverOfTheDay(now = new Date()) {
  const races = await db.race.findMany({
    where: {
      status: "FINISHED",
      dotdAnnouncedAt: null,
      OR: [{ finalizedAt: { lte: new Date(now.getTime() - DOTD_VOTING_DAYS * DAY_MS) } }, { dotdClosedAt: { lte: now } }],
    },
    select: { id: true, dotdVotes: { select: { driverId: true } }, results: { select: { userId: true } } },
  });

  for (const race of races) {
    const claim = await db.race.updateMany({ where: { id: race.id, dotdAnnouncedAt: null }, data: { dotdAnnouncedAt: now } });
    if (claim.count === 0) continue;
    const { winners } = tallyVotes(race.dotdVotes);
    if (winners.length === 0) continue;

    await db.activity.createMany({ data: winners.map((actorId) => ({ type: "DRIVER_OF_THE_DAY" as const, actorId, raceId: race.id })) });
    // The first winner names the award; a tie is rare and the race page lists everyone
    await db.notification.createMany({
      data: race.results.map((r) => ({ type: "DRIVER_OF_THE_DAY" as const, userId: r.userId, actorId: winners[0], raceId: race.id })),
    });
  }
}
