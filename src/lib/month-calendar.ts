/**
 * Month grids for calendars, weeks starting on Monday. Days and months are
 * plain keys ("2026-11-14", "2026-11") in Madrid wall-clock terms — see
 * toLocalInput — so grids never shift with the viewer's time zone.
 */

import { t } from "@/i18n";

export type CalendarDay = {
  /** "2026-11-14" */
  key: string;
  day: number;
  /** False for the leading/trailing days of the neighbouring months */
  inMonth: boolean;
};

/** Column headers, Monday first. */
export const WEEKDAYS = t.common.weekdays;

const pad = (n: number) => String(n).padStart(2, "0");

function parseMonth(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return { year, mon };
}

const keyOf = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** "2026-11-14" → "2026-11" */
export const monthOf = (day: string) => day.slice(0, 7);

/** "2026-11" + 2 → "2027-01" */
export function addMonths(month: string, count: number) {
  const { year, mon } = parseMonth(month);
  const date = new Date(Date.UTC(year, mon - 1 + count, 1));
  return keyOf(date).slice(0, 7);
}

/** Every month from `from` to `to`, both included. */
export function monthRange(from: string, to: string) {
  const months: string[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) months.push(month);
  return months;
}

/** Whole weeks (Monday to Sunday) covering the month. */
export function monthWeeks(month: string): CalendarDay[][] {
  const { year, mon } = parseMonth(month);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  // getUTCDay: Sunday = 0 → days since Monday
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < total; i++) {
    const date = new Date(Date.UTC(year, mon - 1, 1 - lead + i));
    if (i % 7 === 0) weeks.push([]);
    weeks.at(-1)!.push({ key: keyOf(date), day: date.getUTCDate(), inMonth: date.getUTCMonth() === mon - 1 });
  }
  return weeks;
}

/** "2026-11-14" → "14/11/2026" */
export function formatDayKey(day: string) {
  const [year, mon, date] = day.split("-");
  return `${date}/${mon}/${year}`;
}

/** "2026-11" → "noviembre 2026" */
export function formatMonth(month: string) {
  const { year, mon } = parseMonth(month);
  return `${t.common.months[mon - 1]} ${year}`;
}
