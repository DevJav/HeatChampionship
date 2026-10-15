"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { logSeasonStatusChange } from "@/lib/log-activity";
import { int, parseForm, text, type FormState } from "@/lib/forms";
import { recomputeSeasonPoints } from "@/lib/results";
import { requireAdmin } from "@/lib/session";

/** "9, 6, 4, 3, 2, 1" → [9, 6, 4, 3, 2, 1] */
const pointsTable = z.string().transform((value, ctx) => {
  const parts = value.split(/[\s,;]+/).filter(Boolean);
  const points = parts.map(Number);
  if (parts.length === 0 || parts.length > 12 || points.some((p) => !Number.isInteger(p) || p < 0 || p > 100)) {
    ctx.addIssue({
      code: "custom",
      message: "Entre 1 y 12 números enteros separados por comas, p. ej. 9, 6, 4, 3, 2, 1.",
    });
    return z.NEVER;
  }
  return points;
});

const seasonSchema = z.object({
  name: text(60),
  year: int(2000, 2100),
  status: z.enum(["UPCOMING", "ACTIVE", "FINISHED"]),
  pointsTable,
});

type SeasonData = z.output<typeof seasonSchema>;

/**
 * Only one season can be in progress: activating one finishes the others.
 * Saving also re-scores finished races, in case the points table changed.
 */
async function saveSeason(data: SeasonData, seasonId?: string) {
  await db.$transaction(async (tx) => {
    if (data.status === "ACTIVE") {
      const finishing = await tx.season.findMany({
        where: { status: "ACTIVE", ...(seasonId ? { id: { not: seasonId } } : {}) },
        select: { id: true },
      });
      for (const other of finishing) {
        await tx.season.update({ where: { id: other.id }, data: { status: "FINISHED" } });
        await logSeasonStatusChange(tx, other.id, "ACTIVE", "FINISHED");
      }
    }
    if (seasonId) {
      const current = await tx.season.findUniqueOrThrow({ where: { id: seasonId }, select: { status: true } });
      await tx.season.update({ where: { id: seasonId }, data });
      await recomputeSeasonPoints(tx, seasonId);
      await logSeasonStatusChange(tx, seasonId, current.status, data.status);
    } else {
      const season = await tx.season.create({ data });
      await logSeasonStatusChange(tx, season.id, null, data.status);
    }
  });
}

export async function createSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(seasonSchema, formData);
  if (!parsed.ok) return parsed.state;
  await saveSeason(parsed.data);
  redirect("/admin/temporadas");
}

export async function updateSeason(seasonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(seasonSchema, formData);
  if (!parsed.ok) return parsed.state;
  await saveSeason(parsed.data, seasonId);
  redirect("/admin/temporadas");
}

export async function deleteSeason(seasonId: string) {
  await requireAdmin();
  if ((await db.race.count({ where: { seasonId } })) > 0) {
    throw new Error("Season has races");
  }
  await db.season.delete({ where: { id: seasonId } });
  redirect("/admin/temporadas");
}
