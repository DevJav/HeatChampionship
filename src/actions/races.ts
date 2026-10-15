"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { fromLocalInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { announceSignupsOpen } from "@/lib/email/announce";
import { logRaceStatusChange } from "@/lib/log-activity";
import { formValues, int, optionalInt, optionalText, parseForm, text, type FormState } from "@/lib/forms";
import { joinRace, leaveRace, rebalanceSeats, RegistrationError } from "@/lib/registrations";
import { recomputeSeasonPoints } from "@/lib/results";
import { requireAdmin, requireUser } from "@/lib/session";
import { deleteStoredPhoto } from "@/lib/uploads";
import { t } from "@/i18n";

// ---------------------------------------------------------------------------
// Player sign-ups
// ---------------------------------------------------------------------------

/** Join or leave a race (intent from the form). Used by the sign-up panel. */
export async function updateMyRegistration(_prev: FormState, formData: FormData): Promise<FormState> {
  const raceId = String(formData.get("raceId") ?? "");
  const user = await requireUser(`/carreras/${raceId}`);

  try {
    if (formData.get("intent") === "leave") await leaveRace(raceId, user.id);
    else await joinRace(raceId, user.id);
  } catch (error) {
    if (error instanceof RegistrationError) return { error: error.message };
    throw error;
  }

  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Admin: races
// ---------------------------------------------------------------------------

const dateTime = (message: string) =>
  z.string().transform((value, ctx) => {
    const date = fromLocalInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return date;
  });

const optionalDateTime = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = fromLocalInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: t.admin.racesAdmin.invalidDate });
      return z.NEVER;
    }
    return date;
  });

const raceSchema = z
  .object({
    seasonId: text(),
    trackId: text(),
    round: int(1, 99),
    scheduledAt: dateTime(t.admin.racesAdmin.dateRequired),
    signupDeadline: optionalDateTime,
    location: optionalText(120),
    laps: optionalInt(1, 10),
    maxPlayers: int(2, siteConfig.maxPlayersPerRace),
    // Absent when the select is disabled (finished races)
    status: z.enum(["DRAFT", "UPCOMING", "OPEN", "CLOSED"]).optional(),
    notes: optionalText(2000),
  })
  .refine((race) => !race.signupDeadline || race.signupDeadline <= race.scheduledAt, {
    path: ["signupDeadline"],
    message: t.admin.racesAdmin.deadlineAfterRace,
  });

const DUPLICATE_ROUND = t.admin.racesAdmin.duplicateRound;

export async function createRace(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(raceSchema, formData);
  if (!parsed.ok) return parsed.state;

  let raceId: string;
  try {
    raceId = await db.$transaction(async (tx) => {
      const race = await tx.race.create({ data: { ...parsed.data, status: parsed.data.status ?? "DRAFT" } });
      await logRaceStatusChange(tx, race.id, null, race.status);
      return race.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { round: DUPLICATE_ROUND }, values: formValues(formData) };
    }
    throw error;
  }

  if (parsed.data.status === "OPEN") after(() => announceSignupsOpen(raceId));
  redirect(`/admin/carreras/${raceId}`);
}

export async function updateRace(raceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(raceSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { status, ...data } = parsed.data;
  let opened = false;
  try {
    await db.$transaction(async (tx) => {
      const current = await tx.race.findUniqueOrThrow({ where: { id: raceId }, select: { status: true } });
      // Finished races keep their status; results are handled separately
      const nextStatus = current.status === "FINISHED" ? "FINISHED" : (status ?? current.status);
      await tx.race.update({ where: { id: raceId }, data: { ...data, status: nextStatus } });
      await logRaceStatusChange(tx, raceId, current.status, nextStatus);
      opened = current.status !== "OPEN" && nextStatus === "OPEN";
      // Seats may have changed
      await rebalanceSeats(tx, raceId);
      // A finished race moved to another season takes that season's points table
      if (nextStatus === "FINISHED") await recomputeSeasonPoints(tx, data.seasonId);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { round: DUPLICATE_ROUND }, values: formValues(formData) };
    }
    throw error;
  }

  if (opened) after(() => announceSignupsOpen(raceId));
  redirect("/admin/carreras");
}

export async function deleteRace(raceId: string) {
  await requireAdmin();
  const photos = await db.racePhoto.findMany({ where: { raceId }, select: { path: true } });
  await db.race.delete({ where: { id: raceId } });
  await Promise.all(photos.map((photo) => deleteStoredPhoto(photo.path)));
  redirect("/admin/carreras");
}

// ---------------------------------------------------------------------------
// Admin: entrants
// ---------------------------------------------------------------------------

/** Sign a player up on their behalf (ignores the sign-up window). */
export async function addEntrant(raceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: t.admin.racesAdmin.chooseDriverError };

  try {
    await joinRace(raceId, userId, { force: true });
  } catch (error) {
    if (error instanceof RegistrationError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}

export async function removeEntrant(raceId: string, userId: string) {
  await requireAdmin();
  await leaveRace(raceId, userId, { force: true });
  refresh();
}
