import { connection } from "next/server";
import { blockedDaysOf } from "../date-poll";
import { db } from "../db";
import { driverSelect } from "./standings";

const pollInclude = {
  answers: { select: { userId: true, day: true, answer: true } },
  race: { select: { id: true, round: true, scheduledAt: true, dateTbd: true, status: true, track: { select: { name: true } } } },
} as const;

/**
 * The open date poll, or else the latest closed one (to show what was decided),
 * with every answer and the drivers asked: every account that isn't banned, plus
 * anyone who answered (even if banned since).
 */
export async function getDatePoll() {
  await connection();
  const poll =
    (await db.datePoll.findFirst({ where: { closedAt: null }, orderBy: { createdAt: "desc" }, include: pollInclude })) ??
    (await db.datePoll.findFirst({ orderBy: { closedAt: "desc" }, include: pollInclude }));
  if (!poll) return null;

  const answered = [...new Set(poll.answers.map((a) => a.userId))];
  const drivers = await db.user.findMany({
    where: {
      // `banned: { not: true }` would also drop a NULL `banned`
      OR: [{ id: { in: answered } }, { banned: false }, { banned: null }],
    },
    orderBy: { name: "asc" },
    select: driverSelect,
  });
  return { ...poll, blockedDays: blockedDaysOf(poll.blockedDays), drivers };
}

export type DatePollView = NonNullable<Awaited<ReturnType<typeof getDatePoll>>>;

/** The open poll's id and who has answered it, for the home page banner. */
export async function getOpenDatePoll() {
  await connection();
  const poll = await db.datePoll.findFirst({
    where: { closedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, answers: { distinct: ["userId"], select: { userId: true } } },
  });
  return poll && { id: poll.id, respondents: poll.answers.map((a) => a.userId) };
}
