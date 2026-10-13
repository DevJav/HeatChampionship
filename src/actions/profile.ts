"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth, PASSWORD_MIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { optionalText, parseForm, type FormState } from "@/lib/forms";
import { requireUser } from "@/lib/session";
import { deleteStoredFile, storeAvatar, storedPathFromUrl, UploadError } from "@/lib/uploads";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(40, "Máximo 40 caracteres."),
  bio: optionalText(300),
  favoriteColorId: z
    .string()
    .optional()
    .transform((value) => value || null),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { favoriteColorId } = parsed.data;
  if (favoriteColorId && !(await db.carColor.findFirst({ where: { id: favoriteColorId, active: true } }))) {
    return { fieldErrors: { favoriteColorId: "Color no válido." } };
  }
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  refresh();
  return { message: "Perfil guardado." };
}

export async function uploadAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una imagen." };

  let storedPath: string;
  try {
    storedPath = await storeAvatar(user.id, file);
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }

  const previous = storedPathFromUrl(user.image);
  await db.user.update({ where: { id: user.id }, data: { image: `/media/${storedPath}` } });
  if (previous) await deleteStoredFile(previous);
  refresh();
  return { message: "Foto actualizada." };
}

export async function removeAvatar() {
  const user = await requireUser("/perfil");
  const previous = storedPathFromUrl(user.image);
  await db.user.update({ where: { id: user.id }, data: { image: null } });
  if (previous) await deleteStoredFile(previous);
  refresh();
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Obligatorio."),
    newPassword: z.string().min(PASSWORD_MIN, `Mínimo ${PASSWORD_MIN} caracteres.`).max(128),
    confirm: z.string(),
  })
  .refine((data) => data.newPassword === data.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("/perfil");
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // Never echo passwords back
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  const requestHeaders = await headers();
  try {
    await auth.api.changePassword({
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword },
      headers: requestHeaders,
    });
  } catch (error) {
    const code = error instanceof APIError ? (error.body as { code?: string } | undefined)?.code : undefined;
    if (code === "INVALID_PASSWORD") return { fieldErrors: { currentPassword: "La contraseña actual no es correcta." } };
    console.error(error);
    return { error: "No se pudo cambiar la contraseña." };
  }
  // Log out other devices but keep this session. (changePassword's own
  // revokeOtherSessions option replaces the current session too, which
  // logged the user out here.)
  await auth.api.revokeOtherSessions({ headers: requestHeaders });
  return { message: "Contraseña cambiada. Se ha cerrado la sesión en tus otros dispositivos." };
}
