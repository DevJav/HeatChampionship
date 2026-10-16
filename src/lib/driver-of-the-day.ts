/**
 * Driver of the Day: after the results are published, the race's drivers
 * vote for someone else from that race. The tally stays hidden until voting
 * closes; then the most voted driver (ties share it) gets the award.
 * Pure functions, unit-tested in driver-of-the-day.test.ts.
 */

import { t } from "@/i18n";

export const DOTD_VOTING_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DotdRace = { status: string; finalizedAt: Date | null };

/** When voting closes, or null while the race has no published results. */
export function votingClosesAt(race: DotdRace) {
  return race.status === "FINISHED" && race.finalizedAt ? new Date(race.finalizedAt.getTime() + DOTD_VOTING_DAYS * DAY_MS) : null;
}

export function votingPhase(race: DotdRace, now: Date): "not-started" | "open" | "closed" {
  const closes = votingClosesAt(race);
  if (!closes) return "not-started";
  return now < closes ? "open" : "closed";
}

export class VoteError extends Error {}

/** Throws a VoteError with a message for the voter when the vote isn't allowed. */
export function checkVote(race: DotdRace, driverIds: string[], voterId: string, driverId: string, now: Date) {
  if (votingPhase(race, now) !== "open") throw new VoteError(t.dotd.errors.closed);
  if (!driverIds.includes(voterId)) throw new VoteError(t.dotd.errors.onlyDrivers);
  if (voterId === driverId) throw new VoteError(t.dotd.errors.notYourself);
  if (!driverIds.includes(driverId)) throw new VoteError(t.dotd.errors.notInRace);
}

/** Votes per driver and the winners (empty without votes), most voted first. */
export function tallyVotes(votes: { driverId: string }[]) {
  const counts = new Map<string, number>();
  for (const { driverId } of votes) counts.set(driverId, (counts.get(driverId) ?? 0) + 1);
  const most = Math.max(0, ...counts.values());
  const winners = [...counts].filter(([, n]) => n === most && n > 0).map(([id]) => id);
  return { counts, winners, most };
}
