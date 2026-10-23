"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import type { Availability } from "@/generated/prisma/client";
import { blockedDaysOf, isBlockableDay, isOpenDay, MAX_POLL_MONTHS, monthsToRange } from "@/lib/date-poll";
import { toLocalInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { announceDatePoll } from "@/lib/email/announce";
import { optionalText, parseForm, type FormState } from "@/lib/forms";
import { addMonths, isMonthKey } from "@/lib/month-calendar";
import { requireAdmin, requireUser } from "@/lib/session";
import { t } from "@/i18n";

const PAGE = "/carreras/fecha";
const ANSWERS: Availability[] = ["YES", "MAYBE", "NO"];

const today = () => toLocalInput(new Date()).slice(0, 10);

async function openPoll(pollId: string) {
  const poll = await db.datePoll.findUnique({ where: { id: pollId } });
  return poll && !poll.closedAt ? { ...poll, blockedDays: blockedDaysOf(poll.blockedDays) } : null;
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

/** Sets (or with null, clears) the signed-in driver's answer for some days. Days that can't be answered are skipped. */
export async function setAvailability(pollId: string, days: string[], answer: Availability | null) {
  const user = await requireUser(PAGE);
  if ((answer && !ANSWERS.includes(answer)) || !Array.isArray(days)) return;
  const poll = await openPoll(pollId);
  if (!poll) return { error: t.datePoll.errors.closed };

  const now = today();
  const valid = days.filter((day) => isOpenDay(poll, day, now));
  await db.$transaction(
    valid.map((day) => {
      const where = { pollId_userId_day: { pollId, userId: user.id, day } };
      return answer
        ? db.datePollAnswer.upsert({ where, create: { pollId, userId: user.id, day, answer }, update: { answer } })
        : db.datePollAnswer.deleteMany({ where: where.pollId_userId_day });
    }),
  );
  refresh();
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const month = z.string().refine(isMonthKey, t.datePoll.errors.month);

const pollSchema = z
  .object({ from: month, to: month, note: optionalText(300) })
  .refine((poll) => poll.to >= poll.from, { path: ["to"], message: t.datePoll.errors.toBeforeFrom })
  .refine((poll) => poll.to < addMonths(poll.from, MAX_POLL_MONTHS), { path: ["to"], message: t.datePoll.errors.tooLong(MAX_POLL_MONTHS) });

/** Opens a poll over whole months. Only one is open at a time. */
export async function createDatePoll(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(pollSchema, formData);
  if (!parsed.ok) return parsed.state;

  if (await db.datePoll.findFirst({ where: { closedAt: null }, select: { id: true } })) return { error: t.datePoll.errors.alreadyOpen };
  const { from, to, note } = parsed.data;
  const poll = await db.$transaction(async (tx) => {
    const created = await tx.datePoll.create({ data: { ...monthsToRange(from, to), blockedDays: [], note } });
    await tx.activity.create({ data: { type: "DATE_POLL_OPENED" } });
    return created;
  });

  after(() => announceDatePoll(poll.id));
  refresh();
  return {};
}

/** Blocks a day for everyone, or opens it again. Answers are kept, so unblocking brings them back. */
export async function toggleBlockedDay(pollId: string, day: string) {
  await requireAdmin();
  const poll = await openPoll(pollId);
  if (!poll || !isBlockableDay(poll, day, today())) return;

  const blocked = poll.blockedDays.includes(day) ? poll.blockedDays.filter((d) => d !== day) : [...poll.blockedDays, day].sort();
  await db.datePoll.update({ where: { id: pollId }, data: { blockedDays: blocked } });
  refresh();
}

/** Drops a poll and its line in the activity feed. */
export async function deleteDatePoll(pollId: string) {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    const poll = await tx.datePoll.delete({ where: { id: pollId } });
    await tx.activity.deleteMany({ where: { type: "DATE_POLL_OPENED", createdAt: { gte: poll.createdAt } } });
  });
  refresh();
}
