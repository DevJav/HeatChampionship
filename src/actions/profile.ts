"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, PASSWORD_MIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { formValues, optionalText, parseForm, type FormState } from "@/lib/forms";
import { requireUser, type CurrentUser } from "@/lib/session";
import { deleteStoredFile, storeAvatar, storedPathFromUrl, UploadError } from "@/lib/uploads";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(40, "Máximo 40 caracteres."),
  bio: optionalText(300),
  favoriteColorId: z
    .string()
    .optional()
    .transform((value) => value || null),
});

/** No color chosen, or one that's still offered. */
async function isValidColor(favoriteColorId: string | null) {
  return !favoriteColorId || !!(await db.carColor.findFirst({ where: { id: favoriteColorId, active: true } }));
}

/** The picked file, or null when the file input was left empty. */
function pickedFile(formData: FormData, name: string) {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

/** Store a new profile picture and delete the old one. Returns an error message, or null on success. */
async function replaceAvatar(user: CurrentUser, file: File) {
  let storedPath: string;
  try {
    storedPath = await storeAvatar(user.id, file);
  } catch (error) {
    if (error instanceof UploadError) return error.message;
    throw error;
  }

  const previous = storedPathFromUrl(user.image);
  await db.user.update({ where: { id: user.id }, data: { image: `/media/${storedPath}` } });
  if (previous) await deleteStoredFile(previous);
  return null;
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.ok) return parsed.state;

  if (!(await isValidColor(parsed.data.favoriteColorId))) {
    return { fieldErrors: { favoriteColorId: "Color no válido." } };
  }
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  refresh();
  return { message: "Perfil guardado." };
}

export async function uploadAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const file = pickedFile(formData, "avatar");
  if (!file) return { error: "Elige una imagen." };

  const error = await replaceAvatar(user, file);
  if (error) return { error };
  refresh();
  return { message: "Foto actualizada." };
}

// The name was just chosen at sign-up, so the welcome step only asks for the extras
const setupSchema = profileSchema.pick({ bio: true, favoriteColorId: true });

/** Welcome step right after sign-up: every field is optional, then on to the home page. */
export async function completeProfileSetup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/bienvenida");
  const parsed = parseForm(setupSchema, formData);
  if (!parsed.ok) return parsed.state;

  if (!(await isValidColor(parsed.data.favoriteColorId))) {
    return { fieldErrors: { favoriteColorId: "Color no válido." }, values: formValues(formData) };
  }
  const file = pickedFile(formData, "avatar");
  if (file) {
    const error = await replaceAvatar(user, file);
    if (error) return { fieldErrors: { avatar: error }, values: formValues(formData) };
  }
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  redirect("/");
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
