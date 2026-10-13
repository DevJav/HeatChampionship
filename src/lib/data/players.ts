import { connection } from "next/server";
import type { PlayerResult } from "../player-stats";
import { db } from "../db";
import { driverSelect } from "./standings";

const resultSelect = {
  position: true,
  startPosition: true,
  points: true,
  carColor: { select: { name: true, hex: true } },
  race: {
    select: {
      id: true,
      round: true,
      scheduledAt: true,
      season: { select: { id: true, name: true } },
      track: { select: { id: true, name: true } },
    },
  },
} as const;

type ResultRow = { position: number | null; startPosition: number | null; points: number; race: { id: string; scheduledAt: Date; track: { id: string; name: string } } };

/** Shape results for summarizePlayer(). */
export function toPlayerResults(results: ResultRow[]): PlayerResult[] {
  return results.map((r) => ({
    raceId: r.race.id,
    scheduledAt: r.race.scheduledAt,
    trackId: r.race.track.id,
    trackName: r.race.track.name,
    position: r.position,
    startPosition: r.startPosition,
    points: r.points,
  }));
}

/** Every driver with their finished-race results (career). */
export async function listPlayers() {
  await connection();
  return db.user.findMany({
    orderBy: { name: "asc" },
    select: {
      ...driverSelect,
      results: { where: { race: { status: "FINISHED" } }, select: resultSelect },
    },
  });
}

/** A driver's profile with all their finished-race results, newest first. */
export async function getPlayerProfile(username: string) {
  await connection();
  return db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      ...driverSelect,
      bio: true,
      createdAt: true,
      results: {
        where: { race: { status: "FINISHED" } },
        orderBy: { race: { scheduledAt: "desc" } },
        select: resultSelect,
      },
    },
  });
}

/** The logged-in user's editable profile fields. */
export async function getEditableProfile(userId: string) {
  await connection();
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, username: true, image: true, bio: true, favoriteColorId: true },
  });
}
