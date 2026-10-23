import { connection } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";

const resultInclude = {
  user: {
    select: { id: true, name: true, username: true, image: true, favoriteColor: { select: { name: true, hex: true } } },
  },
  carColor: { select: { id: true, name: true, hex: true } },
  upgrades: { select: { upgrade: { select: { id: true, name: true } } } },
} satisfies Prisma.RaceResultInclude;

export type RaceResultDetail = Prisma.RaceResultGetPayload<{ include: typeof resultInclude }>;

/** Results of a race in finishing order. */
export async function getRaceResults(raceId: string) {
  await connection();
  return db.raceResult.findMany({
    where: { raceId },
    include: resultInclude,
    orderBy: { position: "asc" },
  });
}

export async function getRacePhotos(raceId: string) {
  await connection();
  return db.racePhoto.findMany({
    where: { raceId },
    orderBy: { createdAt: "asc" },
    include: { uploadedBy: { select: { id: true, name: true, username: true } } },
  });
}

export type RacePhotoDetail = Awaited<ReturnType<typeof getRacePhotos>>[number];

/**
 * Everything the results editor needs: the race, who raced (confirmed
 * entrants plus anyone who already has a result) and the catalogs.
 */
export async function getResultsEditorData(raceId: string) {
  await connection();
  const race = await db.race.findUnique({
    where: { id: raceId },
    include: {
      track: true,
      season: true,
      registrations: {
        where: { status: "CONFIRMED" },
        orderBy: { queuedAt: "asc" },
        select: { user: { select: { id: true, name: true, image: true } } },
      },
      results: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          upgrades: { select: { upgradeId: true } },
        },
      },
    },
  });
  if (!race) return null;

  const [carColors, upgrades] = await Promise.all([
    db.carColor.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.upgrade.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Union of entrants and existing results, results first (in finishing order)
  const players = new Map<string, { id: string; name: string; image: string | null }>();
  const ordered = [...race.results].sort((a, b) => a.position - b.position);
  for (const result of ordered) players.set(result.user.id, result.user);
  for (const { user } of race.registrations) if (!players.has(user.id)) players.set(user.id, user);

  // Inactive catalog entries stay selectable if this race already uses them
  const usedColors = new Set(race.results.map((r) => r.carColorId));
  const usedUpgrades = new Set(race.results.flatMap((r) => r.upgrades.map((u) => u.upgradeId)));

  return {
    race,
    players: [...players.values()],
    carColors: carColors.filter((c) => c.active || usedColors.has(c.id)),
    upgrades: upgrades.filter((u) => u.active || usedUpgrades.has(u.id)),
  };
}
