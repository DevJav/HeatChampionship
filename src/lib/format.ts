import { siteConfig } from "@/config/site";

const { locale, timeZone } = siteConfig;

const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone });
const dateTimeFormat = new Intl.DateTimeFormat(locale, {
  dateStyle: "long",
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
