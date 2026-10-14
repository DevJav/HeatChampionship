"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearRaceResults, saveRaceResults } from "@/lib/results";
import { MAX_SPINS, validateResults, type ResultsValidation } from "@/lib/results-rules";
import { requireAdmin } from "@/lib/session";

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
  if (!parsed.success) return { error: "Datos no válidos. Recarga la página.", rowErrors: {} };

  const validation = validateResults(parsed.data);
  if (validation.error) return validation;

  await saveRaceResults(raceId, parsed.data);
  redirect(`/carreras/${raceId}`);
}

export async function clearResults(raceId: string) {
  await requireAdmin();
  await clearRaceResults(raceId);
  refresh();
}
