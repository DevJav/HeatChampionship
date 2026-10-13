"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { countryName } from "@/lib/countries";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  checkbox,
  formValues,
  int,
  optionalInt,
  optionalText,
  parseForm,
  text,
  type FormState,
} from "@/lib/forms";
import { requireAdmin } from "@/lib/session";

/** "Gran Bretaña" → "gran-bretana" */
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function duplicate(formData: FormData, field: string, message: string): FormState {
  return { fieldErrors: { [field]: message }, values: formValues(formData) };
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

const trackSchema = z.object({
  name: text(60),
  countryCode: optionalText(10).refine((code) => code == null || countryName(code) != null, "País no válido."),
  expansion: optionalText(60),
  defaultLaps: optionalInt(1, 10),
  description: optionalText(500),
  active: checkbox(),
});

export async function createTrack(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(trackSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    await db.track.create({ data: { ...parsed.data, slug: slugify(parsed.data.name) } });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate(formData, "name", "Ya existe un circuito con ese nombre.");
    throw error;
  }
  redirect("/admin/circuitos");
}

export async function updateTrack(trackId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(trackSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    await db.track.update({ where: { id: trackId }, data: { ...parsed.data, slug: slugify(parsed.data.name) } });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate(formData, "name", "Ya existe un circuito con ese nombre.");
    throw error;
  }
  redirect("/admin/circuitos");
}

/** Only unused tracks can be deleted; used ones should be deactivated. */
export async function deleteTrack(trackId: string) {
  await requireAdmin();
  if ((await db.race.count({ where: { trackId } })) > 0) throw new Error("Track is in use");
  await db.track.delete({ where: { id: trackId } });
  redirect("/admin/circuitos");
}

// ---------------------------------------------------------------------------
// Upgrade cards
// ---------------------------------------------------------------------------

const upgradeSchema = z.object({
  name: text(60),
  description: optionalText(500),
  expansion: optionalText(60),
  active: checkbox(),
});

export async function createUpgrade(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(upgradeSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    await db.upgrade.create({ data: parsed.data });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate(formData, "name", "Ya existe una mejora con ese nombre.");
    throw error;
  }
  redirect("/admin/mejoras");
}

export async function updateUpgrade(upgradeId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(upgradeSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    await db.upgrade.update({ where: { id: upgradeId }, data: parsed.data });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate(formData, "name", "Ya existe una mejora con ese nombre.");
    throw error;
  }
  redirect("/admin/mejoras");
}

export async function deleteUpgrade(upgradeId: string) {
  await requireAdmin();
  if ((await db.resultUpgrade.count({ where: { upgradeId } })) > 0) throw new Error("Upgrade is in use");
  await db.upgrade.delete({ where: { id: upgradeId } });
  redirect("/admin/mejoras");
}

// ---------------------------------------------------------------------------
// Car colors
// ---------------------------------------------------------------------------

const carColorSchema = z.object({
  name: text(30),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido."),
  sortOrder: int(0, 999),
  active: checkbox(),
});

export async function createCarColor(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(carColorSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    await db.carColor.create({ data: parsed.data });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate(formData, "name", "Ya existe un color con ese nombre.");
    throw error;
  }
  redirect("/admin/colores");
}

export async function updateCarColor(colorId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(carColorSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    await db.carColor.update({ where: { id: colorId }, data: parsed.data });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate(formData, "name", "Ya existe un color con ese nombre.");
    throw error;
  }
  redirect("/admin/colores");
}

export async function deleteCarColor(colorId: string) {
  await requireAdmin();
  if ((await db.raceResult.count({ where: { carColorId: colorId } })) > 0) throw new Error("Color is in use");
  await db.carColor.delete({ where: { id: colorId } });
  redirect("/admin/colores");
}
