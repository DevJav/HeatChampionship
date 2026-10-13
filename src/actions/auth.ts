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

/** `values` echoes the username and name back — never the password. */
export type AuthFormState = FormState;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: "Usuario o contraseña incorrectos.",
  USERNAME_IS_ALREADY_TAKEN: "Ese nombre de usuario ya está cogido.",
  USER_ALREADY_EXISTS: "Ese nombre de usuario ya está cogido.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ese nombre de usuario ya está cogido.",
  REGISTRATION_CLOSED: "El registro de nuevos pilotos está cerrado.",
  BANNED_USER: "Tu cuenta está suspendida. Habla con el organizador.",
};

function messageFor(error: unknown) {
  if (error instanceof APIError) {
    const code = (error.body as { code?: string } | undefined)?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  }
  console.error(error);
  return "Algo ha ido mal. Inténtalo de nuevo.";
}

const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `Mínimo ${USERNAME_MIN} caracteres.`)
  .max(USERNAME_MAX, `Máximo ${USERNAME_MAX} caracteres.`)
  .regex(USERNAME_PATTERN, "Solo minúsculas, números, punto y guion bajo.");

const signUpSchema = z
  .object({
    username: usernameField,
    name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(40, "Máximo 40 caracteres."),
    password: z.string().min(PASSWORD_MIN, `Mínimo ${PASSWORD_MIN} caracteres.`).max(128),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { username };

  if (!username || !password) {
    return { error: "Introduce tu usuario y contraseña.", values };
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

  redirect("/");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
