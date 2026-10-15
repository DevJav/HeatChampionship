"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { auth, PASSWORD_MIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { newEmailToken, sendWelcome } from "@/lib/email/send";
import { EMAIL_TOPICS, serializeTopics } from "@/lib/email/topics";
import { formValues, optionalText, parseForm, type FormState } from "@/lib/forms";
import { requireUser, type CurrentUser } from "@/lib/session";
import { deleteStoredFile, storeAvatar, storedPathFromUrl, UploadError } from "@/lib/uploads";
import { t } from "@/i18n";

const profileSchema = z.object({
  name: z.string().trim().min(2, t.forms.minChars(2)).max(40, t.forms.maxChars(40)),
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
    return { fieldErrors: { favoriteColorId: t.forms.invalidColor } };
  }
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  refresh();
  return { message: t.profile.saved };
}

const emailSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.union([z.literal(""), z.email(t.email.invalidAddress).max(254)]))
    .transform((value) => value || null),
});

/** The optional email address and which topics to get emails about. Empty address = no emails. */
export async function updateEmailPreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const parsed = parseForm(emailSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { contactEmail } = parsed.data;
  const topics = contactEmail ? EMAIL_TOPICS.filter((topic) => formData.get(`topic-${topic}`) === "on") : [];
  const current = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { contactEmail: true, emailToken: true },
  });
  await db.user.update({
    where: { id: user.id },
    data: {
      contactEmail,
      emailTopics: serializeTopics(topics),
      // A new address gets a new unsubscribe link
      emailToken: contactEmail === current.contactEmail && current.emailToken ? current.emailToken : newEmailToken(),
    },
  });
  // Confirm a new address works (and is theirs)
  if (contactEmail && contactEmail !== current.contactEmail && topics.length > 0) after(() => sendWelcome(user.id));

  refresh();
  if (!contactEmail) return { message: current.contactEmail ? t.email.removed : t.email.saved };
  return { message: topics.length > 0 ? t.email.saved : t.email.savedNoTopics };
}

export async function uploadAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const file = pickedFile(formData, "avatar");
  if (!file) return { error: t.forms.uploads.chooseImage };

  const error = await replaceAvatar(user, file);
  if (error) return { error };
  refresh();
  return { message: t.profile.photoUpdated };
}

// The name was just chosen at sign-up, so the welcome step only asks for the extras
const setupSchema = profileSchema.pick({ bio: true, favoriteColorId: true });

/** Welcome step right after sign-up: every field is optional, then on to the home page. */
export async function completeProfileSetup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/bienvenida");
  const parsed = parseForm(setupSchema, formData);
  if (!parsed.ok) return parsed.state;

  if (!(await isValidColor(parsed.data.favoriteColorId))) {
    return { fieldErrors: { favoriteColorId: t.forms.invalidColor }, values: formValues(formData) };
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
    currentPassword: z.string().min(1, t.forms.required),
    newPassword: z.string().min(PASSWORD_MIN, t.forms.minChars(PASSWORD_MIN)).max(128),
    confirm: z.string(),
  })
  .refine((data) => data.newPassword === data.confirm, {
    path: ["confirm"],
    message: t.forms.passwordsDontMatch,
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
    if (code === "INVALID_PASSWORD") return { fieldErrors: { currentPassword: t.profile.wrongPassword } };
    console.error(error);
    return { error: t.profile.passwordChangeFailed };
  }
  // Log out other devices but keep this session. (changePassword's own
  // revokeOtherSessions option replaces the current session too, which
  // logged the user out here.)
  await auth.api.revokeOtherSessions({ headers: requestHeaders });
  return { message: t.profile.passwordChanged };
}
