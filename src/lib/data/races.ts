import { connection } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";

const entrantSelect = {
  id: true,
  status: true,
  queuedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      favoriteColor: { select: { name: true, hex: true } },
    },
  },
} satisfies Prisma.RegistrationSelect;

const raceDetailInclude = {
  track: true,
  season: true,
  registrations: {
    where: { status: { not: "WITHDRAWN" } },
    orderBy: [{ queuedAt: "asc" }, { id: "asc" }],
    select: entrantSelect,
  },
} satisfies Prisma.RaceInclude;

export type RaceDetail = Prisma.RaceGetPayload<{ include: typeof raceDetailInclude }>;
export type Entrant = RaceDetail["registrations"][number];

const raceSummaryInclude = {
  track: true,
  season: { select: { id: true, name: true } },
  _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
} satisfies Prisma.RaceInclude;

export type RaceSummary = Prisma.RaceGetPayload<{ include: typeof raceSummaryInclude }>;

/** A race with its entrants. Drafts are only returned when `includeDraft`. */
export async function getRace(id: string, { includeDraft = false } = {}) {
  await connection();
  const race = await db.race.findUnique({ where: { id }, include: raceDetailInclude });
  if (!race || (race.status === "DRAFT" && !includeDraft)) return null;
  return race;
}

const raceListInclude = {
  ...raceSummaryInclude,
  /** Podium, for finished races */
  results: {
    where: { position: { lte: 3 } },
    orderBy: { position: "asc" },
    select: {
      position: true,
      user: { select: { id: true, name: true, username: true, favoriteColor: { select: { hex: true } } } },
    },
  },
} satisfies Prisma.RaceInclude;

export type RaceListItem = Prisma.RaceGetPayload<{ include: typeof raceListInclude }>;

/** All published races with their podium, soonest first. */
export async function listPublishedRaces() {
  await connection();
  return db.race.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { scheduledAt: "asc" },
    include: raceListInclude,
  });
}

/** The next published race that hasn't been raced yet. */
export async function getNextRace() {
  await connection();
  return db.race.findFirst({
    where: { status: { in: ["UPCOMING", "OPEN", "CLOSED"] }, scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    include: raceDetailInclude,
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listAllRaces() {
  await connection();
  return db.race.findMany({
    orderBy: [{ scheduledAt: "desc" }],
    include: raceSummaryInclude,
  });
}

/** Next free round number in a season. */
export async function nextRoundNumber(seasonId: string) {
  await connection();
  const last = await db.race.findFirst({
    where: { seasonId },
    orderBy: { round: "desc" },
    select: { round: true },
  });
  return (last?.round ?? 0) + 1;
}

/** The most recently finished race (for the home page). */
export async function getLastFinishedRace() {
  await connection();
  return db.race.findFirst({
    where: { status: "FINISHED" },
    orderBy: { scheduledAt: "desc" },
    include: { track: true, season: { select: { name: true } } },
  });
}
