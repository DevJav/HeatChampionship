import type { Availability } from "@/generated/prisma/client";
import { addMonths, monthOf } from "./month-calendar";

/**
 * Date polls: the admin offers a range of days ("2026-11-01" keys, site time
 * zone, as in month-calendar.ts) and blocks the ones that don't suit; drivers
 * answer yes / maybe / no for the rest, and the best days rise to the top.
 */

export type DayAnswer = { userId: string; day: string; answer: Availability };

export type PollRange = { firstDay: string; lastDay: string; blockedDays: string[] };

/** At most this many months per poll, to keep the calendar short. */
export const MAX_POLL_MONTHS = 3;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const isMonthKey = (value: string) => MONTH_PATTERN.test(value);

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toKey = (date: Date) => date.toISOString().slice(0, 10);

/** Every day from `first` to `last`, both included. */
export function daysBetween(first: string, last: string) {
  const days: string[] = [];
  for (let date = toDate(first); toKey(date) <= last; date.setUTCDate(date.getUTCDate() + 1)) days.push(toKey(date));
  return days;
}

/** "2026-11" to "2026-12" → the 1st of November to the 31st of December. */
export function monthsToRange(from: string, to: string) {
  const end = toDate(`${addMonths(to, 1)}-01`);
  end.setUTCDate(0);
  return { firstDay: `${from}-01`, lastDay: toKey(end) };
}

/** The months a poll's calendar shows. */
export function pollMonths(poll: Pick<PollRange, "firstDay" | "lastDay">) {
  const months: string[] = [];
  for (let month = monthOf(poll.firstDay); month <= monthOf(poll.lastDay); month = addMonths(month, 1)) months.push(month);
  return months;
}

/** The stored JSON of blocked days, ignoring anything that isn't a day. */
export function blockedDaysOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((day): day is string => typeof day === "string" && DAY_PATTERN.test(day)) : [];
}

/** Whether drivers can still answer for a day: inside the range, not blocked and not past. */
export function isOpenDay(poll: PollRange, day: string, today: string) {
  return DAY_PATTERN.test(day) && day >= poll.firstDay && day <= poll.lastDay && day >= today && !poll.blockedDays.includes(day);
}

/** Whether the admin can block or unblock a day: inside the range and not past. */
export function isBlockableDay(poll: PollRange, day: string, today: string) {
  return DAY_PATTERN.test(day) && day >= poll.firstDay && day <= poll.lastDay && day >= today;
}

export function openDays(poll: PollRange, today: string) {
  return daysBetween(poll.firstDay, poll.lastDay).filter((day) => isOpenDay(poll, day, today));
}

export type DayTally = {
  day: string;
  /** User ids per answer */
  yes: string[];
  maybe: string[];
  no: string[];
  /** Yes counts 1, maybe ½ */
  score: number;
};

/** Who said what for each of the given days. */
export function tallyDays(days: string[], answers: DayAnswer[]): DayTally[] {
  const byDay = Map.groupBy(answers, (a) => a.day);
  return days.map((day) => {
    const dayAnswers = byDay.get(day) ?? [];
    const who = (answer: Availability) => dayAnswers.filter((a) => a.answer === answer).map((a) => a.userId);
    const [yes, maybe, no] = [who("YES"), who("MAYBE"), who("NO")];
    return { day, yes, maybe, no, score: yes.length + maybe.length / 2 };
  });
}

/** Days with at least one yes or maybe, best first: higher score, then fewer "no", then the earlier day. */
export function rankDays(days: string[], answers: DayAnswer[]) {
  return tallyDays(days, answers)
    .filter((tally) => tally.score > 0)
    .sort((a, b) => b.score - a.score || a.no.length - b.no.length || a.day.localeCompare(b.day));
}
