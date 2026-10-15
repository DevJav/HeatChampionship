import type { ActivityType, Prisma, RaceStatus, SeasonStatus } from "@/generated/prisma/client";
import { db } from "./db";

/**
 * Writing the public activity feed. Each trigger calls one of these with its
 * transaction (or `db`); one-off events are logged once, so re-saving is safe.
 */

type Client = Prisma.TransactionClient;
type Target = { actorId?: string; raceId?: string; seasonId?: string };

/** A sign-up undone within this time drops both entries instead of logging the change of mind. */
const CHANGE_OF_MIND_MS = 60 * 60 * 1000;
/** Photo uploads by the same driver within this time share one entry. */
const PHOTO_BATCH_MS = 6 * 60 * 60 * 1000;

async function logOnce(client: Client, type: ActivityType, target: Target) {
  if (await client.activity.findFirst({ where: { type, ...target }, select: { id: true } })) return;
  await client.activity.create({ data: { type, ...target } });
}

export async function logPlayerJoined(userId: string) {
  await logOnce(db, "PLAYER_JOINED", { actorId: userId });
}

/** After a race is created or saved: announced when it leaves draft, then when sign-ups open. */
export async function logRaceStatusChange(client: Client, raceId: string, from: RaceStatus | null, to: RaceStatus) {
  if (to === "OPEN" && from !== "OPEN") {
    await logOnce(client, "SIGNUPS_OPENED", { raceId });
  } else if ((from === null || from === "DRAFT") && (to === "UPCOMING" || to === "CLOSED")) {
    await logOnce(client, "RACE_ANNOUNCED", { raceId });
  }
}

/** A driver joined or left a race. Undoing a recent move removes it from the feed instead. */
export async function logRegistration(
  client: Client,
  type: "RACE_SIGNUP" | "RACE_WITHDRAWAL",
  raceId: string,
  userId: string,
) {
  const opposite = type === "RACE_SIGNUP" ? "RACE_WITHDRAWAL" : "RACE_SIGNUP";
  const last = await client.activity.findFirst({
    where: { raceId, actorId: userId, type: { in: ["RACE_SIGNUP", "RACE_WITHDRAWAL"] } },
    orderBy: { createdAt: "desc" },
  });
  if (last?.type === opposite && Date.now() - last.createdAt.getTime() < CHANGE_OF_MIND_MS) {
    await client.activity.delete({ where: { id: last.id } });
    return;
  }
  await client.activity.create({ data: { type, raceId, actorId: userId } });
}

/** Results saved: logged the first time only. */
export async function logResultsPublished(client: Client, raceId: string) {
  await logOnce(client, "RESULTS_PUBLISHED", { raceId });
}

/** Results cleared: the next save is announced again. */
export async function unlogResultsPublished(client: Client, raceId: string) {
  await client.activity.deleteMany({ where: { type: "RESULTS_PUBLISHED", raceId } });
}

/** A driver added photos to a race; a recent entry of theirs is moved up instead of repeated. */
export async function logPhotosAdded(raceId: string, userId: string) {
  const recent = await db.activity.findFirst({
    where: {
      type: "PHOTOS_ADDED",
      raceId,
      actorId: userId,
      createdAt: { gte: new Date(Date.now() - PHOTO_BATCH_MS) },
    },
    select: { id: true },
  });
  if (recent) await db.activity.update({ where: { id: recent.id }, data: { createdAt: new Date() } });
  else await db.activity.create({ data: { type: "PHOTOS_ADDED", raceId, actorId: userId } });
}

/** After a season is created or saved. */
export async function logSeasonStatusChange(
  client: Client,
  seasonId: string,
  from: SeasonStatus | null,
  to: SeasonStatus,
) {
  if (to === "ACTIVE" && from !== "ACTIVE") await logOnce(client, "SEASON_STARTED", { seasonId });
  if (to === "FINISHED" && from !== "FINISHED") await logOnce(client, "SEASON_FINISHED", { seasonId });
}
