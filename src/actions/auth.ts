"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  auth,
  PASSWORD_MIN,
  placeholderEmail,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from "@/lib/auth";
import { fieldErrorsOf, type FormState } from "@/lib/forms";
import { safeReturnPath } from "@/lib/paths";
import { t } from "@/i18n";

/** `values` echoes the username and name back — never the password. */
export type AuthFormState = FormState;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: t.auth.errors.INVALID_USERNAME_OR_PASSWORD,
  USERNAME_IS_ALREADY_TAKEN: t.auth.errors.USERNAME_TAKEN,
  USER_ALREADY_EXISTS: t.auth.errors.USERNAME_TAKEN,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: t.auth.errors.USERNAME_TAKEN,
  REGISTRATION_CLOSED: t.auth.errors.REGISTRATION_CLOSED,
  BANNED_USER: t.auth.errors.BANNED_USER,
};

function messageFor(error: unknown) {
  if (error instanceof APIError) {
    const code = (error.body as { code?: string } | undefined)?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  }
  console.error(error);
  return t.auth.genericError;
}

const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, t.forms.minChars(USERNAME_MIN))
  .max(USERNAME_MAX, t.forms.maxChars(USERNAME_MAX))
  .regex(USERNAME_PATTERN, t.auth.usernamePattern);

const signUpSchema = z
  .object({
    username: usernameField,
    name: z.string().trim().min(2, t.forms.minChars(2)).max(40, t.forms.maxChars(40)),
    password: z.string().min(PASSWORD_MIN, t.forms.minChars(PASSWORD_MIN)).max(128),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: t.forms.passwordsDontMatch,
  });

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { username };

  if (!username || !password) {
    return { error: t.auth.enterCredentials, values };
  }

  try {
    await auth.api.signInUsername({ body: { username, password }, headers: await headers() });
  } catch (error) {
    return { error: messageFor(error), values };
  }

  redirect(safeReturnPath(formData.get("volver")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData);
  const values = { username: String(raw.username ?? ""), name: String(raw.name ?? "") };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const { username, name, password } = parsed.data;
  try {
    await auth.api.signUpEmail({
      body: { email: placeholderEmail(username), password, name, username },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageFor(error), values };
  }

  // New players finish their profile before anything else
  redirect("/bienvenida");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
