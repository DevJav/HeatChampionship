import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/**
 * Current user for this request, or null. Reads cookies, so any component
 * calling it must render inside a <Suspense> boundary (Cache Components).
 * Deduplicated per request with React cache().
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function isAdmin(user: { role?: string | null } | null) {
  return user?.role === "admin";
}

/** Redirects to the login page when nobody is logged in. */
export async function requireUser(returnTo?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/entrar?volver=${encodeURIComponent(returnTo)}` : "/entrar");
  }
  return user;
}

/** Admin-only pages and actions. Non-admins get a 404, not a hint the page exists. */
export async function requireAdmin(returnTo?: string) {
  const user = await requireUser(returnTo);
  if (!isAdmin(user)) notFound();
  return user;
}
