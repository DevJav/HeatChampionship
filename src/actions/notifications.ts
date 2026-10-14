"use server";

import { db } from "@/lib/db";
import { getNotifications } from "@/lib/data/notifications";
import { getCurrentUser } from "@/lib/session";

/** The bell's polling: latest notifications for whoever is logged in (null when nobody is). */
export async function fetchMyNotifications() {
  const user = await getCurrentUser();
  return user ? getNotifications(user.id) : null;
}

export async function markNotificationRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { id: notificationId, userId: user.id, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
}
