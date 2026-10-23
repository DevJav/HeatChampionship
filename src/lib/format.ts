import { siteConfig } from "@/config/site";
import { t } from "@/i18n";

const { locale, timeZone } = siteConfig;

const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone });
const dateTimeFormat = new Intl.DateTimeFormat(locale, {
  dateStyle: "long",
  timeStyle: "short",
  timeZone,
});
const fullDateTimeFormat = new Intl.DateTimeFormat(locale, {
  dateStyle: "full",
  timeStyle: "short",
  timeZone,
});
const shortDateFormat = new Intl.DateTimeFormat(locale, {
  day: "numeric",
  month: "short",
  timeZone,
});

/** "13 de octubre de 2026" */
export const formatDate = (date: Date) => dateFormat.format(date);
/** "13 de octubre de 2026, 19:30" */
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);
/** "martes, 13 de octubre de 2026, 19:30" */
export const formatFullDateTime = (date: Date) => fullDateTimeFormat.format(date);
/** "13 oct" */
export const formatShortDate = (date: Date) => shortDateFormat.format(date);

const decimalFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const signedFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: "exceptZero" });

/** "2,5" */
export const formatDecimal = (value: number) => decimalFormat.format(value);
/** "+1,5" / "−0,5" / "0" */
export const formatSigned = (value: number) => signedFormat.format(value);

const percentFormat = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

/** 0.25 → "25 %" */
export const formatPercent = (value: number) => percentFormat.format(value);

const listFormat = new Intl.ListFormat(locale, { type: "conjunction" });

/** "Ana", "Ana y Marco", "Ana, Marco y Lucía", "Ana, Marco, Lucía y 2 más" */
export function formatNames(names: string[], max = 3) {
  return names.length <= max ? listFormat.format(names) : t.common.namesAndMore(names.slice(0, max), names.length - max);
}

/** "1 carrera" / "3 carreras" */
export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const raceDayFormat = new Intl.DateTimeFormat(locale, {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone,
});

/** "sábado, 14 de noviembre, 18:00" */
export const formatRaceDay = (date: Date) => raceDayFormat.format(date);

const dayNameFormat = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone });

/** "2026-11-14" → "sábado, 14 de noviembre" (a calendar day key, see month-calendar.ts) */
export const formatDayName = (day: string) => dayNameFormat.format(new Date(`${day}T12:00:00Z`));

const dayPartsFormat = new Intl.DateTimeFormat(locale, {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone,
});
const timeFormat = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });

/** Pieces for a calendar-style date block: { weekday: "sáb", day: "14", month: "nov", year: "2026", time: "18:00" } */
export function dateParts(date: Date) {
  const parts = Object.fromEntries(dayPartsFormat.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    weekday: String(parts.weekday ?? "").replace(".", ""),
    day: String(parts.day ?? ""),
    month: String(parts.month ?? "").replace(".", ""),
    year: String(parts.year ?? ""),
    time: timeFormat.format(date),
  };
}

const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

/** "ahora", "hace 5 minutos", "hace 3 horas", "ayer"… then a short date after a week. */
export function formatRelative(date: Date, now = new Date()) {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return t.common.now;
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relativeFormat.format(Math.round(seconds / 86_400), "day");
  return formatShortDate(date);
}
