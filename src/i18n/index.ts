import { en } from "./en";
import { es, type Dictionary } from "./es";

/**
 * The site speaks one language per deployment, chosen with APP_LOCALE ("es" or "en")
 * at build time (see next.config.ts), so server and client components agree.
 */
export type Locale = "es" | "en";

export const locale: Locale = process.env.APP_LOCALE === "en" ? "en" : "es";

/** BCP 47 tag for Intl formatters: dates, numbers, country names, sorting */
export const intlLocale = locale === "en" ? "en-GB" : "es-ES";

/** UI text for the deployment's language: `t.standings.title` */
export const t: Dictionary = locale === "en" ? en : es;
