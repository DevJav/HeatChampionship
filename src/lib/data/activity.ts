import { connection } from "next/server";
import type { ActivityType } from "@/generated/prisma/client";
import { describeActivity } from "../activity";
import { db } from "../db";
import { computeStandings } from "../standings";

/** What the feed shows for each entry. */
export type ActivityItem = {
  id: string;
  type: ActivityType;
  subject: string | null;
  text: string;
  href: string;
  actor: { name: string; image: string | null; color: string | null } | null;
  createdAt: Date;
};

/** Champion of each finished season, by name. */
async function championsOf(seasonIds: string[]) {
  if (seasonIds.length === 0) return new Map<string, string>();
  const seasons = await db.season.findMany({
    where: { id: { in: seasonIds }, status: "FINISHED" },
    select: {
      id: true,
      races: {
        where: { status: "FINISHED" },
        select: { id: true, round: true, results: { select: { userId: true, position: true, points: true } } },
      },
    },
  });
  const leaders = new Map(seasons.map((s) => [s.id, computeStandings(s.races)[0]?.userId]));
  const users = await db.user.findMany({
    where: { id: { in: [...leaders.values()].filter((id) => id != null) } },
    select: { id: true, name: true },
  });
  const names = new Map(users.map((u) => [u.id, u.name]));
  return new Map([...leaders].flatMap(([seasonId, userId]) => (userId && names.has(userId) ? [[seasonId, names.get(userId)!]] : [])));
}

/**
 * The league's latest activity, newest first. Entries about draft races are
 * hidden. Pass the last id seen as `after` for the next page.
 */
export async function listActivity({ limit = 10, after }: { limit?: number; after?: string } = {}) {
  await connection();
  const rows = await db.activity.findMany({
    where: { OR: [{ raceId: null }, { race: { status: { not: "DRAFT" } } }] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(after && { cursor: { id: after }, skip: 1 }),
    select: {
      id: true,
      type: true,
      createdAt: true,
      actor: { select: { name: true, username: true, image: true, favoriteColor: { select: { hex: true } } } },
      race: {
        select: {
          id: true,
          round: true,
          scheduledAt: true,
          track: { select: { name: true } },
          results: { where: { position: 1 }, select: { user: { select: { name: true } } } },
        },
      },
      season: { select: { id: true, name: true } },
    },
  });

  const page = rows.slice(0, limit);
  const champions = await championsOf(
    page.filter((row) => row.type === "SEASON_FINISHED" && row.season).map((row) => row.season!.id),
  );

  const items: ActivityItem[] = page.map((row) => ({
    id: row.id,
    type: row.type,
    ...describeActivity({
      type: row.type,
      actor: row.actor,
      race: row.race && { ...row.race, winner: row.race.results[0]?.user.name ?? null },
      season: row.season && { ...row.season, champion: champions.get(row.season.id) ?? null },
    }),
    actor: row.actor && { name: row.actor.name, image: row.actor.image, color: row.actor.favoriteColor?.hex ?? null },
    createdAt: row.createdAt,
  }));
  return { items, nextCursor: rows.length > limit ? page.at(-1)!.id : null };
}
