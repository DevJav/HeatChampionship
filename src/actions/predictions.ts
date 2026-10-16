"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { checkPicks, PredictionError } from "@/lib/predictions";
import { requireUser } from "@/lib/session";
import { t } from "@/i18n";

/** Saves or changes the signed-in user's podium prediction for a race. */
export async function savePrediction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raceId = String(formData.get("raceId") ?? "");
  const picks = ["first", "second", "third"].map((key) => String(formData.get(key) ?? ""));
  const user = await requireUser(`/carreras/${raceId}`);

  const race = await db.race.findUnique({
    where: { id: raceId },
    select: { status: true, scheduledAt: true, registrations: { where: { status: "CONFIRMED" }, select: { userId: true } } },
  });
  if (!race) return { error: t.predictions.errors.closed };
  try {
    checkPicks(race, race.registrations.map((r) => r.userId), picks, new Date());
  } catch (error) {
    if (error instanceof PredictionError) return { error: error.message };
    throw error;
  }

  const [firstId, secondId, thirdId] = picks;
  await db.prediction.upsert({
    where: { raceId_userId: { raceId, userId: user.id } },
    create: { raceId, userId: user.id, firstId, secondId, thirdId },
    update: { firstId, secondId, thirdId },
  });
  refresh();
  return { message: t.predictions.saved };
}
