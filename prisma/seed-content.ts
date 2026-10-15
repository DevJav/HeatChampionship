/**
 * Data the seed scripts write, in the language of the deployment (APP_LOCALE).
 * Unlike the UI text in src/i18n this ends up in the database, where the admin
 * can edit it afterwards.
 */

type Driver = { username: string; name: string };
type RaceRef = { id: string; title: string; track: string };

/** What the sample seed generated, for articles to talk about */
export type ShowcaseContext = {
  pastSeason: { id: string; name: string };
  currentSeason: { id: string; name: string };
  /** Final standings of the past season, champion first */
  pastTop: Driver[];
  lastPastRace: RaceRef;
  /** Round 1 of the current season and its top three */
  roundOne: RaceRef & { podium: Driver[] };
  openRace: RaceRef & { date: string; entrants: Driver[] };
};

type ShowcaseArticle = {
  title: string;
  excerpt: string;
  body: string;
  category: "PREVIEW" | "REPORT" | "NEWS" | "RULES";
  pinned?: boolean;
  raceId?: string;
  publishedAt: Date;
  /** Thread under the article; `reply` answers the comment at that index */
  comments?: { author: string; body: string; reply?: number }[];
};

const es = {
  tracks: [
    { slug: "usa", name: "Estados Unidos", countryCode: "US", expansion: "Juego base" },
    { slug: "italia", name: "Italia", countryCode: "IT", expansion: "Juego base" },
    { slug: "francia", name: "Francia", countryCode: "FR", expansion: "Juego base" },
    { slug: "gran-bretana", name: "Gran Bretaña", countryCode: "GB", expansion: "Juego base" },
  ],
  carColors: [
    { name: "Rojo", hex: "#d10500" },
    { name: "Azul", hex: "#1d4ed8" },
    { name: "Verde", hex: "#15803d" },
    { name: "Amarillo", hex: "#facc15" },
    { name: "Negro", hex: "#1c1917" },
    { name: "Blanco", hex: "#f5f5f4" },
    { name: "Naranja", hex: "#ea580c" },
    { name: "Morado", hex: "#7e22ce" },
  ],
  // Upgrade cards are added from the admin (names depend on your edition).
  upgrades: [] as { name: string; description?: string; expansion?: string }[],
  pastSeason: "Temporada 2025/26",
  currentSeason: "Temporada 2026/27",
  demoPassword: "carreras",
  /** Demo drivers: hidden skill (higher = faster) and favorite car (index into carColors) */
  drivers: [
    { username: "ana", name: "Ana", skill: 1.35, color: 1 },
    { username: "marco", name: "Marco", skill: 1.25, color: 0 },
    { username: "lucia", name: "Lucía", skill: 1.05, color: 2 },
    { username: "pablo", name: "Pablo", skill: 0.8, color: 4 },
    { username: "sara", name: "Sara", skill: 0.95, color: 7 },
    { username: "diego", name: "Diego", skill: 0.7, color: 6 },
    { username: "elena", name: "Elena", skill: 1.15, color: 3 },
    { username: "ortega", name: "Ortega", skill: 0.85 },
  ] as { username: string; name: string; skill: number; color?: number }[],
  locations: ["Casa de Javier", "Casa de Ana", "Local El Dado", "Casa de Marco"],
  raceNotes: [
    "Módulo de clima activado.",
    "Partida con cartas de evento de campeonato.",
    null,
    "Se jugó con la variante de garaje.",
    null,
  ],
  resultNotes: [
    "Remontada desde el fondo de la parrilla",
    "Se pasó de calor en la última curva",
    "Salida de cohete con la marcha alta",
    "Rebufo perfecto en la recta final",
    "Gestionó el calor como nadie",
    "Penalizado por exceso de velocidad en curva",
  ],
  openRace: { location: "Casa de Ana", notes: "Traed algo de picar. Se juega con el módulo de clima." },
  draftRace: { location: "Local El Dado", notes: "Carrera navideña." },
  /** Showcase articles: written for the English demo only */
  articles: (() => []) as (ctx: ShowcaseContext) => ShowcaseArticle[],
};

type SeedContent = typeof es;

const en: SeedContent = {
  tracks: [
    { slug: "usa", name: "USA", countryCode: "US", expansion: "Base game" },
    { slug: "italy", name: "Italy", countryCode: "IT", expansion: "Base game" },
    { slug: "france", name: "France", countryCode: "FR", expansion: "Base game" },
    { slug: "great-britain", name: "Great Britain", countryCode: "GB", expansion: "Base game" },
  ],
  carColors: [
    { name: "Red", hex: "#d10500" },
    { name: "Blue", hex: "#1d4ed8" },
    { name: "Green", hex: "#15803d" },
    { name: "Yellow", hex: "#facc15" },
    { name: "Black", hex: "#1c1917" },
    { name: "White", hex: "#f5f5f4" },
    { name: "Orange", hex: "#ea580c" },
    { name: "Purple", hex: "#7e22ce" },
  ],
  upgrades: [
    { name: "Brakes", description: "Lets you slow down more sharply before a corner.", expansion: "Base game" },
    { name: "Cooling System", description: "Gets Heat cards out of your hand faster.", expansion: "Base game" },
    { name: "Body", description: "Shrugs off part of the Stress from risky moves.", expansion: "Base game" },
    { name: "Tires", description: "Better grip through the corners.", expansion: "Base game" },
    { name: "Wings", description: "Extra stability at high speed.", expansion: "Base game" },
    { name: "Gas Pedal", description: "A burst of speed on the straights.", expansion: "Base game" },
  ],
  pastSeason: "Season 2025/26",
  currentSeason: "Season 2026/27",
  demoPassword: "racedemo",
  drivers: [
    { username: "maya", name: "Maya", skill: 1.35, color: 1 },
    { username: "leo", name: "Leo", skill: 1.25, color: 0 },
    { username: "priya", name: "Priya", skill: 1.05, color: 2 },
    { username: "tom", name: "Tom", skill: 0.8, color: 4 },
    { username: "nina", name: "Nina", skill: 0.95, color: 7 },
    { username: "kenji", name: "Kenji", skill: 0.7, color: 6 },
    { username: "sofia", name: "Sofia", skill: 1.15, color: 3 },
    { username: "oscar", name: "Oscar", skill: 0.85 },
  ],
  locations: ["Sam's place", "Maya's place", "The Dice Tower café", "Leo's flat"],
  raceNotes: [
    "Weather module in play.",
    "Played with championship event cards.",
    null,
    "Played with the garage variant.",
    null,
  ],
  resultNotes: [
    "Came back from the back of the grid",
    "Overheated on the final corner",
    "Rocket start in top gear",
    "Perfect slipstream on the last straight",
    "Managed the heat like nobody else",
    "Penalised for overspeeding in a corner",
  ],
  openRace: { location: "Maya's place", notes: "Bring snacks. We're playing with the weather module." },
  draftRace: { location: "The Dice Tower café", notes: "Holiday race." },
  articles: (ctx) => {
    const [champion, runnerUp, third] = ctx.pastTop;
    const [winner, second, podiumThird] = ctx.roundOne.podium;
    const [favorite, rival] = ctx.openRace.entrants;
    return [
      {
        title: "Welcome to the Heat Championship",
        excerpt: "One race a month, a championship table and a champion at the end of the season. Here's how it works.",
        category: "RULES",
        pinned: true,
        publishedAt: new Date("2025-09-02T10:00:00Z"),
        body: `No more one-off games. From now on every race of **Heat: Pedal to the Metal** we play counts towards a championship, with a calendar, standings and a champion at the end of the season.

## How it works

Once a month we sit around the board for a round of the championship. Each race is posted on the calendar here, with its date, place and track.

- **Limited seats:** up to 8 drivers per race, first come first served.
- **Waitlist:** if the grid is full you join the waitlist. If someone drops out, the first in line moves up automatically.
- **Changed your mind?** You can withdraw yourself until the race starts. Do it early so someone else gets your seat.

## Points

The top six of every race score points:

| Position | Points |
| --- | ---: |
| 1st | 9 |
| 2nd | 6 |
| 3rd | 4 |
| 4th | 3 |
| 5th | 2 |
| 6th | 1 |

Ties in the standings are broken by number of wins, then second places, and so on.

## More than points

Every race leaves its mark on the site: wins, podiums, places gained from the grid… and spins. Yes, we count the spins too. Along the way you'll unlock achievements, and some of them aren't easy to get.

Here's the table, always up to date:

{{clasificacion | Current standings}}

See you on the grid!`,
      },
      {
        title: `${ctx.pastSeason.name} wrap-up: ${champion.name} takes the title`,
        excerpt: `Ten races, one champion. ${champion.name} beat ${runnerUp.name} and ${third.name} to the first title of the Heat Championship.`,
        category: "NEWS",
        raceId: ctx.lastPastRace.id,
        publishedAt: new Date("2026-06-15T09:00:00Z"),
        body: `The first season of the Heat Championship is in the books, and @${champion.username} is our first champion.

It was a season of tight finishes and hot engines: @${runnerUp.username} kept the pressure on until the very end, and @${third.username} completed the podium after a strong second half.

## The champion

{{piloto:${champion.username} | ${champion.name}}}

## Final standings

{{clasificacion:${ctx.pastSeason.id} | ${ctx.pastSeason.name}}}

${ctx.currentSeason.name} starts in September. Same rules, same points, and everyone starts from zero.`,
        comments: [
          { author: runnerUp.username, body: `Congrats @${champion.username}! Next season is mine though.` },
          { author: champion.username, body: "We'll see about that 😄", reply: 0 },
        ],
      },
      {
        title: `${ctx.roundOne.title}: ${winner.name} opens the season with a win`,
        excerpt: `${winner.name} took the first win of ${ctx.currentSeason.name} in ${ctx.roundOne.track}, ahead of ${second.name} and ${podiumThird.name}.`,
        category: "REPORT",
        raceId: ctx.roundOne.id,
        publishedAt: new Date("2026-09-13T11:00:00Z"),
        body: `The new season got off to a flying start in ${ctx.roundOne.track}.

@${winner.username} played the long game: careful through the first corners, then all in on the final lap. @${second.username} pushed hard but ran out of cooling cards on the last straight, and @${podiumThird.username} grabbed the last step of the podium.

{{podio:${ctx.roundOne.id} | ${ctx.roundOne.title}}}

## Full results

{{resultados:${ctx.roundOne.id} | ${ctx.roundOne.title}}}

## The championship after round 1

{{clasificacion-tras:${ctx.roundOne.id} | ${ctx.roundOne.title}}}`,
        comments: [
          { author: second.username, body: "That last corner… I had it. I really had it." },
          { author: winner.username, body: `Next time, @${second.username} 😉`, reply: 0 },
          { author: podiumThird.username, body: "**Podium** is a podium. I'll take it." },
        ],
      },
      {
        title: `Preview: next stop ${ctx.openRace.track}`,
        excerpt: `Sign-up is open for ${ctx.openRace.title} on ${ctx.openRace.date}. The grid is almost full.`,
        category: "PREVIEW",
        raceId: ctx.openRace.id,
        publishedAt: new Date("2026-10-02T09:00:00Z"),
        body: `The championship heads to ${ctx.openRace.track} next month, and the grid is filling up fast.

All eyes are on @${favorite.username}, who has been on form lately, but @${rival.username} knows this track well and won't make it easy.

{{carrera:${ctx.openRace.id} | ${ctx.openRace.title}}}

We're playing with the weather module this time, so plan your Heat carefully. Sign up below before the seats run out!`,
      },
    ];
  },
};

export const seedContent: SeedContent = process.env.APP_LOCALE === "en" ? en : es;
