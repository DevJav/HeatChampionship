/**
 * Site-wide settings: name, navigation, defaults.
 * Edit here to rename the championship or change the menu.
 */
export const siteConfig = {
  name: "Campeonato Heat",
  description:
    "Carreras mensuales de Heat: Pedal to the Metal. Clasificación, resultados y estadísticas.",
  locale: "es-ES",
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
