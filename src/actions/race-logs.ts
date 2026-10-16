"use server";

import { db } from "@/lib/db";
import { raceLogSchema } from "@/lib/race-log/log";
import { hasTrackDrawing } from "@/lib/race-log/tracks";
import { requireAdmin } from "@/lib/session";

export type SaveRaceLogResult = { ok: true } | { ok: false; error: "invalid" | "not-found" };

/**
 * Store a race's log. Called by the recorder after every change (not a
 * <form>), so it returns a status instead of redirecting; the recorder keeps
 * a copy on the device and retries when it fails.
 */
export async function saveRaceLog(raceId: string, input: unknown): Promise<SaveRaceLogResult> {
  await requireAdmin();
  const parsed = raceLogSchema.safeParse(input);
  if (!parsed.success || !hasTrackDrawing(parsed.data.track)) return { ok: false, error: "invalid" };

  const race = await db.race.findUnique({ where: { id: raceId }, select: { id: true } });
  if (!race) return { ok: false, error: "not-found" };

  await db.raceLog.upsert({
    where: { raceId },
    create: { raceId, data: parsed.data },
    update: { data: parsed.data },
  });
  return { ok: true };
}

/** Throw the log away and start again from the setup step. */
export async function deleteRaceLog(raceId: string) {
  await requireAdmin();
  await db.raceLog.deleteMany({ where: { raceId } });
}
