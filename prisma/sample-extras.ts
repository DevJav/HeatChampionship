/**
 * Driver of the Day votes and podium predictions for finished sample races.
 * Used by seed-sample.ts after the races exist, with its own random stream so
 * the races and results it generates stay exactly as before.
 *
 * Votes lean towards drivers who gained places; predictions pick from the
 * race's top finishers, so a few land and the oracle table has a story.
 * Votes that have closed are marked as announced and get their feed entry,
 * dated when voting closed, without notifying anyone.
 */
import { db } from "../src/lib/db";
import { DOTD_VOTING_DAYS, tallyVotes } from "../src/lib/driver-of-the-day";

const DAY_MS = 86_400_000;

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks one item, each weighted by `weight`. */
function weighted<T>(items: T[], weight: (item: T) => number, random: () => number) {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Adds votes and predictions to each finished race. `league` is everyone who
 * may predict. Pass `announce: false` to leave closed votes for the site to
 * announce (with notifications) on the next page load.
 */
export async function addVotesAndPredictions(raceIds: string[], league: string[], random: () => number, { announce = true, now = new Date() } = {}) {
  let votes = 0;
  let predictions = 0;
  for (const raceId of raceIds) {
    const race = await db.race.findUniqueOrThrow({
      where: { id: raceId },
      select: { finalizedAt: true, results: { select: { userId: true, position: true, startPosition: true } } },
    });
    const results = [...race.results].sort((a, b) => a.position - b.position);
    if (results.length < 3 || !race.finalizedAt) continue;

    // Most drivers vote, for someone else; climbing through the field earns votes
    const cast: { driverId: string }[] = [];
    for (const voter of results) {
      if (random() < 0.2) continue;
      const others = results.filter((r) => r.userId !== voter.userId);
      const choice = weighted(others, (r) => 1 + Math.max(0, (r.startPosition ?? r.position) - r.position) * 2 + (r.position === 1 ? 2 : 0), random);
      await db.driverOfTheDayVote.create({ data: { raceId, voterId: voter.userId, driverId: choice.userId } });
      cast.push({ driverId: choice.userId });
      votes++;
    }

    // A handful of people call the podium from the top five finishers
    const top = results.slice(0, 5).map((r) => r.userId);
    for (const userId of shuffle(league, random).slice(0, 3 + Math.floor(random() * 4))) {
      const [firstId, secondId, thirdId] = shuffle(top, random);
      await db.prediction.create({ data: { raceId, userId, firstId, secondId, thirdId } });
      predictions++;
    }

    const closesAt = new Date(race.finalizedAt.getTime() + DOTD_VOTING_DAYS * DAY_MS);
    if (announce && closesAt <= now) {
      await db.race.update({ where: { id: raceId }, data: { dotdAnnouncedAt: closesAt } });
      await db.activity.createMany({
        data: tallyVotes(cast).winners.map((actorId) => ({ type: "DRIVER_OF_THE_DAY" as const, actorId, raceId, createdAt: closesAt })),
      });
    }
  }
  return { votes, predictions };
}
