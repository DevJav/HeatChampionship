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
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { fromLocalInput } from "../src/lib/dates";
import { assignSeats } from "../src/lib/registration-rules";
import { scoreRace } from "../src/lib/scoring";
import { createUserWithPassword } from "../src/lib/users";

const PAST_SEASON = "Temporada 2025/26";
const CURRENT_SEASON = "Temporada 2026/27";
const POINTS = [9, 6, 4, 3, 2, 1];

/** Demo drivers: hidden skill (higher = faster) and favorite car color. */
const drivers: { username: string; name: string; skill: number; color?: string }[] = [
  { username: "javier", name: "Javier", skill: 1.0 },
  { username: "ana", name: "Ana", skill: 1.35, color: "Azul" },
  { username: "marco", name: "Marco", skill: 1.25, color: "Rojo" },
  { username: "lucia", name: "Lucía", skill: 1.05, color: "Verde" },
  { username: "pablo", name: "Pablo", skill: 0.8, color: "Negro" },
  { username: "sara", name: "Sara", skill: 0.95, color: "Morado" },
  { username: "diego", name: "Diego", skill: 0.7, color: "Naranja" },
  { username: "elena", name: "Elena", skill: 1.15, color: "Amarillo" },
  { username: "ortega", name: "Ortega", skill: 0.85 },
];

const locations = ["Casa de Javier", "Casa de Ana", "Local El Dado", "Casa de Marco"];

const raceNotes = [
  "Módulo de clima activado.",
  "Partida con cartas de evento de campeonato.",
  null,
  "Se jugó con la variante de garaje.",
  null,
];

const resultNotes = [
  "Remontada desde el fondo de la parrilla",
  "Se pasó de calor en la última curva",
  "Trompo en la primera vuelta",
  "Rebufo perfecto en la recta final",
  "Gestionó el calor como nadie",
  "Penalizado por exceso de velocidad en curva",
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
      // Demo players may be missing (e.g. after db:reset); javier is the admin from .env
      if (driver.username === "javier") continue;
      user = await createUserWithPassword({ username: driver.username, name: driver.name, password: "carreras" });
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
}) {
  const { seasonId, round, trackId, date, field, colors } = args;
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

  // ~6% chance of retiring; retirees leave the finishing order
  const order = finishingOrder(field);
  const retired = new Set(order.filter(() => random() < 0.06).map((d) => d.id));
  if (retired.size === order.length) retired.delete(order[0].id);
  const finishers = order.filter((d) => !retired.has(d.id));

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
    position: retired.has(d.id) ? null : finishers.findIndex((f) => f.id === d.id) + 1,
  }));
  const points = scoreRace(rows, POINTS);

  for (const row of rows) {
    await db.raceResult.create({
      data: {
        raceId: race.id,
        userId: row.userId,
        position: row.position,
        dnf: row.position == null,
        startPosition: grid.findIndex((d) => d.id === row.userId) + 1,
        carColorId: cars.get(row.userId),
        points: points.get(row.userId) ?? 0,
        notes: random() < 0.15 ? pick(resultNotes) : null,
      },
    });
  }
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
  for (const [i, day] of pastDates.entries()) {
    await finishedRace({
      seasonId: past.id,
      round: i + 1,
      trackId: trackRotation(i),
      date: `${day}T18:00`,
      field: attendance(all),
      colors,
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

  await finishedRace({
    seasonId: current.id,
    round: 1,
    trackId: trackRotation(2),
    date: "2026-09-12T18:00",
    field: attendance(all),
    colors,
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
      location: "Casa de Ana",
      maxPlayers: 6,
      status: "OPEN",
      notes: "Traed algo de picar. Se juega con el módulo de clima.",
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
      location: "Local El Dado",
      status: "DRAFT",
      notes: "Carrera navideña.",
    },
  });
  console.log(`✓ ${CURRENT_SEASON}: ronda 1 finalizada, ronda ${nextRound} abierta, ronda ${nextRound + 1} en borrador`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
