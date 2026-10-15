"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { announceResults } from "@/lib/email/announce";
import { notifyRaceResults } from "@/lib/notify";
import { clearRaceResults, saveRaceResults } from "@/lib/results";
import { MAX_SPINS, validateResults, type ResultsValidation } from "@/lib/results-rules";
import { requireAdmin } from "@/lib/session";
import { t } from "@/i18n";

const rowSchema = z.object({
  userId: z.string().min(1),
  position: z.number().int(),
  spins: z.number().int().min(0).max(MAX_SPINS),
  startPosition: z.number().int().nullable(),
  carColorId: z.string().min(1).nullable(),
  upgradeIds: z.array(z.string().min(1)).max(20),
  notes: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .transform((value) => value || null),
});

const sheetSchema = z.array(rowSchema).max(20);

/**
 * Save a race's results sheet (called from the results editor, not a <form>).
 * On success awards points, marks the race finished and opens its page.
 */
export async function saveResults(raceId: string, input: unknown): Promise<ResultsValidation> {
  await requireAdmin();
  const parsed = sheetSchema.safeParse(input);
  if (!parsed.success) return { error: t.admin.results.invalidData, rowErrors: {} };

  const validation = validateResults(parsed.data);
  if (validation.error) return validation;

  // Corrections to a finished race aren't news
  const wasFinished = (await db.race.findUnique({ where: { id: raceId }, select: { status: true } }))?.status === "FINISHED";
  await saveRaceResults(raceId, parsed.data);
  await notifyRaceResults(raceId);
  if (!wasFinished) after(() => announceResults(raceId));
  redirect(`/carreras/${raceId}`);
}

export async function clearResults(raceId: string) {
  await requireAdmin();
  await clearRaceResults(raceId);
  refresh();
}
