import { connection } from "next/server";
import { db } from "../db";

/** Whether to show the one-time "add your email?" banner to this driver. */
export async function shouldPromptForEmail(userId: string) {
  await connection();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { contactEmail: true, emailPromptDismissedAt: true },
  });
  return !!user && !user.contactEmail && !user.emailPromptDismissedAt;
}

export async function listUsers() {
  await connection();
  return db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { results: true } },
    },
  });
}

/** One player for the admin editor, with how much history they have. */
export async function getAdminUser(id: string) {
  await connection();
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      role: true,
      createdAt: true,
      favoriteColor: { select: { hex: true } },
      _count: { select: { results: true, registrations: true, sessions: true } },
    },
  });
}
