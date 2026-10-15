"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { logPhotosAdded } from "@/lib/log-activity";
import { getCurrentUser, isAdmin, requireUser } from "@/lib/session";
import { deleteStoredPhoto, MAX_FILES_PER_UPLOAD, storeRacePhoto, UploadError } from "@/lib/uploads";

/** Admins and the race's drivers can add photos. */
async function canAddPhotos(raceId: string, user: { id: string; role?: string | null }) {
  if (isAdmin(user)) return true;
  const [registration, result] = await Promise.all([
    db.registration.findFirst({ where: { raceId, userId: user.id, status: { not: "WITHDRAWN" } } }),
    db.raceResult.findFirst({ where: { raceId, userId: user.id } }),
  ]);
  return Boolean(registration || result);
}

export async function uploadRacePhotos(raceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/carreras/${raceId}`);
  if (!(await canAddPhotos(raceId, user))) return { error: "Solo los pilotos de la carrera pueden subir fotos." };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Elige al menos una foto." };
  if (files.length > MAX_FILES_PER_UPLOAD) return { error: `Máximo ${MAX_FILES_PER_UPLOAD} fotos a la vez.` };
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 200) || null;

  let added = 0;
  try {
    for (const file of files) {
      const path = await storeRacePhoto(raceId, file);
      await db.racePhoto.create({ data: { raceId, path, caption, uploadedById: user.id } });
      added++;
    }
  } catch (error) {
    if (error instanceof UploadError) {
      if (added > 0) await logPhotosAdded(raceId, user.id);
      refresh();
      return { error: error.message };
    }
    throw error;
  }

  await logPhotosAdded(raceId, user.id);
  refresh();
  return {};
}

/** Admins can delete any photo; drivers only their own. */
export async function deleteRacePhoto(photoId: string) {
  const user = await getCurrentUser();
  const photo = await db.racePhoto.findUnique({ where: { id: photoId } });
  if (!user || !photo || (!isAdmin(user) && photo.uploadedById !== user.id)) return;

  await db.racePhoto.delete({ where: { id: photoId } });
  await deleteStoredPhoto(photo.path);
  refresh();
}
