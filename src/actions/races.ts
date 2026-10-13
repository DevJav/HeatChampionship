"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { fromLocalInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { formValues, int, optionalInt, optionalText, parseForm, text, type FormState } from "@/lib/forms";
import { joinRace, leaveRace, rebalanceSeats, RegistrationError } from "@/lib/registrations";
import { recomputeSeasonPoints } from "@/lib/results";
import { requireAdmin, requireUser } from "@/lib/session";
import { deleteStoredPhoto } from "@/lib/uploads";

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
      ctx.addIssue({ code: "custom", message: "Fecha no válida." });
      return z.NEVER;
    }
    return date;
  });

const raceSchema = z
  .object({
    seasonId: text(),
    trackId: text(),
    round: int(1, 99),
    scheduledAt: dateTime("Indica la fecha y hora de la carrera."),
    signupDeadline: optionalDateTime,
    location: optionalText(120),
    laps: optionalInt(1, 10),
    maxPlayers: int(2, siteConfig.maxPlayersPerRace),
    // Absent when the select is disabled (finished races)
    status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
    notes: optionalText(2000),
  })
  .refine((race) => !race.signupDeadline || race.signupDeadline <= race.scheduledAt, {
    path: ["signupDeadline"],
    message: "El cierre de inscripciones debe ser antes de la carrera.",
  });

const DUPLICATE_ROUND = "Ya hay una carrera con esa ronda en la temporada.";

export async function createRace(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(raceSchema, formData);
  if (!parsed.ok) return parsed.state;

  let raceId: string;
  try {
    const race = await db.race.create({ data: { ...parsed.data, status: parsed.data.status ?? "DRAFT" } });
    raceId = race.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { round: DUPLICATE_ROUND }, values: formValues(formData) };
    }
    throw error;
  }

  redirect(`/admin/carreras/${raceId}`);
}

export async function updateRace(raceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(raceSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { status, ...data } = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      const current = await tx.race.findUniqueOrThrow({ where: { id: raceId }, select: { status: true } });
      // Finished races keep their status; results are handled separately
      const nextStatus = current.status === "FINISHED" ? "FINISHED" : (status ?? current.status);
      await tx.race.update({ where: { id: raceId }, data: { ...data, status: nextStatus } });
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
  if (!userId) return { error: "Elige un piloto." };

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
