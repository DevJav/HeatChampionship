import { connection } from "next/server";
import { db } from "../db";

export async function listSeasons() {
  await connection();
  return db.season.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { races: true } } },
  });
}

export async function getSeason(id: string) {
  await connection();
  return db.season.findUnique({ where: { id }, include: { _count: { select: { races: true } } } });
}

/** The ACTIVE season, or the most recent one. */
export async function getCurrentSeason() {
  await connection();
  return (
    (await db.season.findFirst({ where: { status: "ACTIVE" }, orderBy: { year: "desc" } })) ??
    (await db.season.findFirst({ orderBy: [{ year: "desc" }, { createdAt: "desc" }] }))
  );
}

export async function listTracks({ activeOnly = false } = {}) {
  await connection();
  return db.track.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { races: true } } },
  });
}

export async function getTrack(id: string) {
  await connection();
  return db.track.findUnique({ where: { id }, include: { _count: { select: { races: true } } } });
}

export async function listUpgrades() {
  await connection();
  return db.upgrade.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { results: true } } },
  });
}

export async function getUpgrade(id: string) {
  await connection();
  return db.upgrade.findUnique({ where: { id }, include: { _count: { select: { results: true } } } });
}

export async function listCarColors() {
  await connection();
  return db.carColor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { results: true } } },
  });
}

export async function getCarColor(id: string) {
  await connection();
  return db.carColor.findUnique({ where: { id }, include: { _count: { select: { results: true } } } });
}
