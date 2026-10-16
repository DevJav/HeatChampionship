"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { checkVote, VoteError } from "@/lib/driver-of-the-day";
import { t } from "@/i18n";
import type { FormState } from "@/lib/forms";
import { requireUser } from "@/lib/session";

/** Casts or changes the signed-in driver's Driver of the Day vote. */
export async function voteDriverOfTheDay(_prev: FormState, formData: FormData): Promise<FormState> {
  const raceId = String(formData.get("raceId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  const user = await requireUser(`/carreras/${raceId}`);

  const race = await db.race.findUnique({
    where: { id: raceId },
    select: { status: true, finalizedAt: true, results: { select: { userId: true } } },
  });
  if (!race) return { error: t.dotd.errors.closed };
  try {
    checkVote(race, race.results.map((r) => r.userId), user.id, driverId, new Date());
  } catch (error) {
    if (error instanceof VoteError) return { error: error.message };
    throw error;
  }

  await db.driverOfTheDayVote.upsert({
    where: { raceId_voterId: { raceId, voterId: user.id } },
    create: { raceId, voterId: user.id, driverId },
    update: { driverId },
  });
  refresh();
  return {};
}
