/**
 * Site-wide settings: name, navigation, defaults.
 * Edit here to rename the championship or change the menu.
 */
import { intlLocale, t } from "@/i18n";

export const siteConfig = {
  name: "Heat Championship",
  description: t.site.description,
  /** Language comes from APP_LOCALE (see src/i18n) */
  locale: intlLocale,
  /** Dates are shown in this time zone regardless of where the server runs (APP_TIME_ZONE) */
  timeZone: process.env.APP_TIME_ZONE || "Europe/Madrid",
  maxPlayersPerRace: 8,
  /** How long a race night lasts, for calendar invites */
  raceDurationHours: 3,
  nav: [
    { label: t.nav.home, href: "/" },
    { label: t.nav.standings, href: "/clasificacion" },
    { label: t.nav.races, href: "/carreras" },
    { label: t.nav.news, href: "/noticias" },
    { label: t.nav.drivers, href: "/pilotos" },
    { label: t.nav.stats, href: "/estadisticas" },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
