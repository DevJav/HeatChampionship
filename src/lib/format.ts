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
