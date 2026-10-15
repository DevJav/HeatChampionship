"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { auth, PASSWORD_MIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkbox, parseForm, type FormState } from "@/lib/forms";
import { temporaryPassword } from "@/lib/passwords";
import { requireAdmin } from "@/lib/session";
import { deleteStoredFile, storedPathFromUrl } from "@/lib/uploads";
import { t } from "@/i18n";

// Admin management of player accounts. Better Auth's admin endpoints check
// the caller's role again, on top of requireAdmin().

const nameSchema = z.object({
  name: z.string().trim().min(2, t.forms.minChars(2)).max(40, t.forms.maxChars(40)),
});

export async function renameUser(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(nameSchema, formData);
  if (!parsed.ok) return parsed.state;
  await db.user.update({ where: { id: userId }, data: { name: parsed.data.name } });
  refresh();
  return { message: t.admin.users.nameSaved };
}

const passwordSchema = z.object({
  newPassword: z
    .string()
    .trim()
    .max(128)
    .refine((value) => value === "" || value.length >= PASSWORD_MIN, t.forms.minChars(PASSWORD_MIN)),
  logout: checkbox(),
});

/** Sets a new password (typed, or generated when left empty) and shows it once. */
export async function resetUserPassword(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // Never echo passwords back
    return { fieldErrors: { newPassword: parsed.error.issues[0].message } };
  }
  const newPassword = parsed.data.newPassword || temporaryPassword();
  const requestHeaders = await headers();
  await auth.api.setUserPassword({ body: { userId, newPassword }, headers: requestHeaders });
  if (parsed.data.logout) await auth.api.revokeUserSessions({ body: { userId }, headers: requestHeaders });
  return {
    message: t.admin.users.passwordSet(newPassword, parsed.data.logout),
  };
}

export async function setUserRole(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  const role = formData.get("role") === "admin" ? "admin" : "user";
  // Never lock yourself out of the admin
  if (userId === admin.id) return;
  await auth.api.setRole({ body: { userId, role }, headers: await headers() });
  refresh();
}

/** Only players without results: deleting results would rewrite past standings. */
export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("Cannot delete yourself");
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { image: true, _count: { select: { results: true } } },
  });
  if (user._count.results > 0) throw new Error("User has race results");
  await auth.api.removeUser({ body: { userId }, headers: await headers() });
  const avatar = storedPathFromUrl(user.image);
  if (avatar) await deleteStoredFile(avatar);
  redirect("/admin/pilotos");
}
