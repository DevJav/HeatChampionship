"use server";

import { APIError } from "better-auth/api";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, PASSWORD_MIN } from "@/lib/auth";
import { resetEmailedRecently } from "@/lib/data/password-reset";
import { db } from "@/lib/db";
import { emailEnabled } from "@/lib/email/send";
import type { FormState } from "@/lib/forms";
import { t } from "@/i18n";

/**
 * "Forgot your password?": emails a link to the driver's contact address.
 * Always answers the same, so nobody can find out who has an email saved.
 */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const values = { username };
  if (!username) return { fieldErrors: { username: t.forms.required }, values };
  if (!emailEnabled()) return { error: t.passwordReset.unavailable, values };

  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, email: true, contactEmail: true, banned: true },
  });
  if (user?.contactEmail && !user.banned && !(await resetEmailedRecently(user.id))) {
    try {
      // Better Auth looks drivers up by their (placeholder) email; sendResetPassword uses the real one
      await auth.api.requestPasswordReset({ body: { email: user.email } });
    } catch (error) {
      console.error("[password reset]", username, error);
      return { error: t.auth.genericError, values };
    }
  }
  return { message: t.passwordReset.sent(username), values };
}

const newPasswordSchema = z
  .object({
    newPassword: z.string().min(PASSWORD_MIN, t.forms.minChars(PASSWORD_MIN)).max(128),
    confirm: z.string(),
  })
  .refine((data) => data.newPassword === data.confirm, { path: ["confirm"], message: t.forms.passwordsDontMatch });

/** The page the emailed link opens: set the new password, then log in with it. */
export async function resetPassword(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // Never echo passwords back
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data.newPassword, token } });
  } catch (error) {
    const code = error instanceof APIError ? (error.body as { code?: string } | undefined)?.code : undefined;
    if (code === "INVALID_TOKEN") return { error: t.passwordReset.linkExpired };
    console.error("[password reset]", error);
    return { error: t.auth.genericError };
  }
  redirect("/entrar?clave=nueva");
}
