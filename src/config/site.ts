/**
 * Site-wide settings: name, navigation, defaults.
 * Edit here to rename the championship or change the menu.
 */
export const siteConfig = {
  name: "Heat Championship",
  description:
    "Carreras mensuales de Heat: Pedal to the Metal. Clasificación, resultados y estadísticas.",
  locale: "es-ES",
  /** Dates are shown in this time zone regardless of where the server runs */
  timeZone: "Europe/Madrid",
  maxPlayersPerRace: 8,
  nav: [
    { label: "Inicio", href: "/" },
    { label: "Clasificación", href: "/clasificacion" },
    { label: "Carreras", href: "/carreras" },
    { label: "Pilotos", href: "/pilotos" },
    { label: "Estadísticas", href: "/estadisticas" },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
