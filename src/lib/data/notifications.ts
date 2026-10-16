import { after, connection } from "next/server";
import { announceDriverOfTheDay } from "../dotd-announce";
import type { NotificationType } from "@/generated/prisma/client";
import { db } from "../db";
import { describeNotification } from "../notifications";

/** What the bell and the notifications page show for each notification. */
export type NotificationItem = {
  id: string;
  type: NotificationType;
  message: string;
  href: string;
  actor: { name: string; image: string | null; color: string | null } | null;
  createdAt: Date;
  read: boolean;
};

/** A user's latest notifications and how many are unread. */
export async function getNotifications(userId: string, { limit = 15 } = {}) {
  await connection();
  // Closed Driver of the Day votes are announced lazily; this runs on every signed-in page
  after(() => announceDriverOfTheDay());
  const [rows, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        commentId: true,
        actorId: true,
        readAt: true,
        createdAt: true,
        actor: { select: { name: true, image: true, favoriteColor: { select: { hex: true } } } },
        article: { select: { slug: true, title: true } },
        race: {
          select: {
            id: true,
            round: true,
            track: { select: { name: true } },
            // The recipient's own result, for "terminaste 2º"
            results: { where: { userId }, select: { position: true, points: true } },
          },
        },
      },
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  const items: NotificationItem[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    ...describeNotification({ ...row, aboutYou: row.actorId === userId }),
    actor: row.actor && { name: row.actor.name, image: row.actor.image, color: row.actor.favoriteColor?.hex ?? null },
    createdAt: row.createdAt,
    read: row.readAt != null,
  }));
  return { items, unread };
}

export type NotificationFeed = Awaited<ReturnType<typeof getNotifications>>;
