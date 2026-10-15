"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unsubscribe } from "@/lib/email/send";
import { requireUser } from "@/lib/session";

/** The button on the unsubscribe page (no login needed: the token is the proof). */
export async function unsubscribeWithToken(token: string) {
  await unsubscribe(token);
  redirect("/correo/baja?hecho=1");
}

async function dismissPrompt() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { emailPromptDismissedAt: new Date() } });
}

/** "Add my email" on the banner: never show it again, and open the email settings. */
export async function openEmailSettings() {
  await dismissPrompt();
  redirect("/perfil#correo");
}

/** "Not now" on the banner. */
export async function dismissEmailPrompt() {
  await dismissPrompt();
  refresh();
}
