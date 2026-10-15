/**
 * Sample championship data for local testing (never run in production):
 *   - "Temporada 2025/26": a finished season of 10 monthly races
 *   - "Temporada 2026/27": a finished round before the existing races, then an
 *     open race with sign-ups and a draft
 *
 *   npm run db:seed:sample
 *
 * Results are random but reproducible (fixed seed), weighted by a hidden skill
 * per driver so the standings look like a real season. Existing races are kept;
 * 2026/27 races are renumbered to make room for the sample round 1.
 * Skips everything if "Temporada 2025/26" already exists.
 *
 * Names, places and notes come from seed-content.ts in the APP_LOCALE language;
 * the English showcase also gets articles with comments. The activity feed is
 * backfilled with the dates things would have happened.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { fromLocalInput } from "../src/lib/dates";
import { formatDate } from "../src/lib/format";
import { assignSeats } from "../src/lib/registration-rules";
import { scoreRace } from "../src/lib/scoring";
import { raceTitle } from "../src/lib/races";
import { slugify } from "../src/lib/slug";
import { createUserWithPassword } from "../src/lib/users";
import type { ActivityType } from "../src/generated/prisma/client";
import { seedContent, type ShowcaseContext } from "./seed-content";

const { pastSeason: PAST_SEASON, currentSeason: CURRENT_SEASON, locations, raceNotes, resultNotes } = seedContent;
const POINTS = [9, 6, 4, 3, 2, 1];

/** The admin from .env races too (never created here) */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.toLowerCase() ?? "javier";

/** Demo drivers: hidden skill (higher = faster) and favorite car color. */
const drivers: { username: string; name: string; skill: number; color?: string }[] = [
  { username: ADMIN_USERNAME, name: process.env.ADMIN_NAME ?? "Admin", skill: 1.0 },
  ...seedContent.drivers.map(({ color, ...driver }) => ({
    ...driver,
    color: color == null ? undefined : seedContent.carColors[color].name,
  })),
];

// ---------------------------------------------------------------------------
// Reproducible randomness
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(2026);
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Finishing order drawn by skill (Plackett–Luce): stronger drivers tend to finish ahead. */
function finishingOrder<T extends { skill: number }>(field: T[]) {
  const remaining = [...field];
  const order: T[] = [];
  while (remaining.length) {
    const weights = remaining.map((d) => d.skill ** 4);
    let roll = random() * weights.reduce((a, b) => a + b, 0);
    const index = weights.findIndex((w) => (roll -= w) <= 0);
    order.push(remaining.splice(index === -1 ? 0 : index, 1)[0]);
  }
  return order;
}

// ---------------------------------------------------------------------------

type Driver = (typeof drivers)[number] & { id: string };

async function loadDrivers(): Promise<Driver[]> {
  const colors = await db.carColor.findMany();
  const result: Driver[] = [];
  for (const driver of drivers) {
    let user = await db.user.findUnique({ where: { username: driver.username } });
    if (!user) {
      // Demo players may be missing (e.g. after db:reset); the admin comes from .env
      if (driver.username === ADMIN_USERNAME) continue;
      user = await createUserWithPassword({ username: driver.username, name: driver.name, password: seedContent.demoPassword });
    }
    const favorite = colors.find((c) => c.name === driver.color);
    if (favorite && !user.favoriteColorId) {
      await db.user.update({ where: { id: user.id }, data: { favoriteColorId: favorite.id } });
    }
    result.push({ ...driver, id: user.id });
  }
  return result;
}

/** Create a finished race with registrations and generated results. */
async function finishedRace(args: {
  seasonId: string;
  round: number;
  trackId: string;
  date: string;
  field: Driver[];
  colors: { id: string; name: string }[];
  upgrades: { id: string }[];
}) {
  const { seasonId, round, trackId, date, field, colors, upgrades } = args;
  const scheduledAt = fromLocalInput(date)!;
  const race = await db.race.create({
    data: {
      seasonId,
      trackId,
      round,
      scheduledAt,
      location: pick(locations),
      maxPlayers: 8,
      status: "FINISHED",
      finalizedAt: scheduledAt,
      notes: pick(raceNotes),
      registrations: {
        create: field.map((d, i) => ({
          userId: d.id,
          status: "CONFIRMED" as const,
          queuedAt: new Date(scheduledAt.getTime() - (20 - i) * 86_400_000),
        })),
      },
    },
  });

  // Everyone finishes; ~20% of drivers spin out, a few of them twice
  const order = finishingOrder(field);
  const spins = new Map(field.map((d) => [d.id, random() < 0.2 ? (random() < 0.25 ? 2 : 1) : 0]));

  const grid = shuffle(field);

  // Each driver takes their favorite car when it's free, otherwise any free color
  const taken = new Set<string>();
  const cars = new Map<string, string>();
  for (const d of shuffle(field)) {
    const preferred = colors.find((c) => c.name === d.color && !taken.has(c.id));
    const car = preferred ?? colors.find((c) => !taken.has(c.id))!;
    taken.add(car.id);
    cars.set(d.id, car.id);
  }

  const rows = field.map((d) => ({
    userId: d.id,
    position: order.findIndex((o) => o.id === d.id) + 1,
  }));
  const points = scoreRace(rows, POINTS);

  for (const row of rows) {
    await db.raceResult.create({
      data: {
        raceId: race.id,
        userId: row.userId,
        position: row.position,
        spins: spins.get(row.userId) ?? 0,
        startPosition: grid.findIndex((d) => d.id === row.userId) + 1,
        carColorId: cars.get(row.userId),
        points: points.get(row.userId) ?? 0,
        notes: random() < 0.15 ? pick(resultNotes) : null,
        // Up to three upgrade cards each, when the catalog has some
        ...(upgrades.length > 0 && {
          upgrades: {
            create: shuffle(upgrades)
              .slice(0, Math.floor(random() * 4))
              .map((upgrade) => ({ upgradeId: upgrade.id })),
          },
        }),
      },
    });
  }
  return race;
}

/** 5–8 drivers, everyone with a fair chance of attending. */
function attendance(all: Driver[]) {
  const size = 5 + Math.floor(random() * 4);
  return shuffle(all).slice(0, Math.min(size, all.length));
}

async function main() {
  if (await db.season.findFirst({ where: { name: PAST_SEASON } })) {
    console.log(`"${PAST_SEASON}" ya existe: no se añade nada.`);
    return;
  }

  const all = await loadDrivers();
  const tracks = await db.track.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const colors = await db.carColor.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const upgrades = await db.upgrade.findMany({ where: { active: true } });
  if (tracks.length === 0 || all.length < 5) throw new Error("Faltan circuitos o pilotos (ejecuta db:seed:demo).");
  const trackRotation = (i: number) => tracks[i % tracks.length].id;

  // --- Past season: Sept 2025 – June 2026, one race a month
  const past = await db.season.create({
    data: { name: PAST_SEASON, year: 2025, status: "FINISHED", pointsTable: POINTS },
  });
  const pastDates = [
    "2025-09-13", "2025-10-18", "2025-11-15", "2025-12-13", "2026-01-17",
    "2026-02-14", "2026-03-14", "2026-04-18", "2026-05-16", "2026-06-13",
  ];
  let lastPastRace = null;
  for (const [i, day] of pastDates.entries()) {
    lastPastRace = await finishedRace({
      seasonId: past.id,
      round: i + 1,
      trackId: trackRotation(i),
      date: `${day}T18:00`,
      field: attendance(all),
      colors,
      upgrades,
    });
  }
  console.log(`✓ ${PAST_SEASON}: ${pastDates.length} carreras finalizadas`);

  // --- Current season: make room for a sample round 1 before the existing races
  const current =
    (await db.season.findFirst({ where: { name: CURRENT_SEASON } })) ??
    (await db.season.create({ data: { name: CURRENT_SEASON, year: 2026, status: "ACTIVE", pointsTable: POINTS } }));
  const existing = await db.race.findMany({ where: { seasonId: current.id }, orderBy: { round: "desc" } });
  for (const race of existing) {
    await db.race.update({ where: { id: race.id }, data: { round: race.round + 1 } });
  }
  if (existing.length) console.log(`✓ ${existing.length} carrera(s) existentes renumeradas (+1)`);

  const roundOne = await finishedRace({
    seasonId: current.id,
    round: 1,
    trackId: trackRotation(2),
    date: "2026-09-12T18:00",
    field: attendance(all),
    colors,
    upgrades,
  });

  const nextRound = existing.length + 2;
  // Upcoming race with sign-ups open: 6 seats, 7 interested → one on the waitlist
  const open = await db.race.create({
    data: {
      seasonId: current.id,
      round: nextRound,
      trackId: trackRotation(1),
      scheduledAt: fromLocalInput("2026-11-14T18:00")!,
      signupDeadline: fromLocalInput("2026-11-13T22:00")!,
      location: seedContent.openRace.location,
      maxPlayers: 6,
      status: "OPEN",
      notes: seedContent.openRace.notes,
    },
  });
  const interested = shuffle(all).slice(0, 7);
  const queued = interested.map((d, i) => ({
    id: d.id,
    queuedAt: new Date(Date.UTC(2026, 9, 1 + i, 10 + i)),
  }));
  const seats = assignSeats(queued, open.maxPlayers);
  for (const entry of queued) {
    await db.registration.create({
      data: { raceId: open.id, userId: entry.id, queuedAt: entry.queuedAt, status: seats.get(entry.id)! },
    });
  }

  await db.race.create({
    data: {
      seasonId: current.id,
      round: nextRound + 1,
      trackId: trackRotation(3),
      scheduledAt: fromLocalInput("2026-12-12T18:00")!,
      location: seedContent.draftRace.location,
      status: "DRAFT",
      notes: seedContent.draftRace.notes,
    },
  });
  console.log(`✓ ${CURRENT_SEASON}: ronda 1 finalizada, ronda ${nextRound} abierta, ronda ${nextRound + 1} en borrador`);

  await backfillActivity({ all, past, current, openRaceId: open.id, queued });
  await seedArticles({ all, past, current, lastPastRaceId: lastPastRace!.id, roundOneId: roundOne.id, openRaceId: open.id, interested });
}

const day = (date: string) => new Date(`${date}T09:00:00Z`);
const hoursAfter = (date: Date, hours: number) => new Date(date.getTime() + hours * 3_600_000);

/** What the feed would show had all this happened through the site, dated when it would have. */
async function backfillActivity(args: {
  all: Driver[];
  past: { id: string };
  current: { id: string };
  openRaceId: string;
  queued: { id: string; queuedAt: Date }[];
}) {
  const { all, past, current, openRaceId, queued } = args;
  const entries: { type: ActivityType; createdAt: Date; actorId?: string; raceId?: string; seasonId?: string }[] = [];

  for (const [i, driver] of all.entries()) {
    if (!(await db.activity.findFirst({ where: { type: "PLAYER_JOINED", actorId: driver.id } }))) {
      entries.push({ type: "PLAYER_JOINED", actorId: driver.id, createdAt: hoursAfter(day("2025-08-25"), i * 20) });
    }
  }
  entries.push({ type: "SEASON_STARTED", seasonId: past.id, createdAt: day("2025-09-01") });
  entries.push({ type: "SEASON_FINISHED", seasonId: past.id, createdAt: day("2026-06-14") });
  entries.push({ type: "SEASON_STARTED", seasonId: current.id, createdAt: day("2026-09-01") });

  const finished = await db.race.findMany({
    where: { seasonId: { in: [past.id, current.id] }, status: "FINISHED" },
    select: { id: true, scheduledAt: true },
  });
  for (const race of finished) {
    entries.push({ type: "RACE_ANNOUNCED", raceId: race.id, createdAt: hoursAfter(race.scheduledAt, -24 * 25) });
    entries.push({ type: "RESULTS_PUBLISHED", raceId: race.id, createdAt: hoursAfter(race.scheduledAt, 4) });
  }

  entries.push({ type: "SIGNUPS_OPENED", raceId: openRaceId, createdAt: day("2026-10-01") });
  for (const entry of queued) {
    entries.push({ type: "RACE_SIGNUP", raceId: openRaceId, actorId: entry.id, createdAt: entry.queuedAt });
  }

  await db.activity.createMany({ data: entries });
  console.log(`✓ ${entries.length} entradas de actividad`);
}

/** The showcase articles from seed-content.ts (none in Spanish), with their comment threads. */
async function seedArticles(args: {
  all: Driver[];
  past: { id: string; name: string };
  current: { id: string; name: string };
  lastPastRaceId: string;
  roundOneId: string;
  openRaceId: string;
  interested: Driver[];
}) {
  const { all, past, current } = args;
  const byId = new Map(all.map((d) => [d.id, d]));
  const asDriver = (id: string) => ({ username: byId.get(id)!.username, name: byId.get(id)!.name });

  const raceRef = async (id: string) => {
    const race = await db.race.findUniqueOrThrow({ where: { id }, include: { track: true } });
    return { id, title: raceTitle(race), track: race.track.name, scheduledAt: race.scheduledAt };
  };

  // Past season standings: points, then wins
  const pastResults = await db.raceResult.findMany({ where: { race: { seasonId: past.id } } });
  const totals = new Map<string, { points: number; wins: number }>();
  for (const result of pastResults) {
    const total = totals.get(result.userId) ?? { points: 0, wins: 0 };
    totals.set(result.userId, { points: total.points + result.points, wins: total.wins + (result.position === 1 ? 1 : 0) });
  }
  const pastTop = [...totals.entries()]
    .sort(([, a], [, b]) => b.points - a.points || b.wins - a.wins)
    .slice(0, 3)
    .map(([userId]) => asDriver(userId));

  const roundOne = await raceRef(args.roundOneId);
  const podium = await db.raceResult.findMany({
    where: { raceId: args.roundOneId, position: { lte: 3 } },
    orderBy: { position: "asc" },
  });
  const open = await raceRef(args.openRaceId);

  const context: ShowcaseContext = {
    pastSeason: past,
    currentSeason: current,
    pastTop,
    lastPastRace: await raceRef(args.lastPastRaceId),
    roundOne: { ...roundOne, podium: podium.map((r) => asDriver(r.userId)) },
    openRace: {
      ...open,
      date: formatDate(open.scheduledAt),
      entrants: [...args.interested].sort((a, b) => b.skill - a.skill),
    },
  };

  const articles = seedContent.articles(context);
  if (articles.length === 0) return;
  const author = await db.user.findUnique({ where: { username: ADMIN_USERNAME } });
  const userIds = new Map(all.map((d) => [d.username, d.id]));

  for (const { comments = [], ...article } of articles) {
    const created = await db.article.create({
      data: { ...article, slug: slugify(article.title).slice(0, 80).replace(/-$/, ""), status: "PUBLISHED", authorId: author?.id },
    });
    const ids: string[] = [];
    for (const [i, comment] of comments.entries()) {
      const parentId = comment.reply == null ? null : ids[comment.reply];
      const saved = await db.articleComment.create({
        data: {
          articleId: created.id,
          authorId: userIds.get(comment.author)!,
          parentId,
          body: comment.body,
          createdAt: hoursAfter(article.publishedAt, 2 + i * 3),
        },
      });
      ids.push(saved.id);
    }
  }
  console.log(`✓ ${articles.length} artículos`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
