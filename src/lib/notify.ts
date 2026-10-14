import type { NotificationType } from "@/generated/prisma/client";
import { mentionedUsernames, referencedUsernames } from "./articles";
import { db } from "./db";

/**
 * Creating notifications. Each trigger calls one of these after its write;
 * nobody is notified about their own actions, and the same event never
 * notifies anyone twice (re-saving an article or results is safe).
 */

type Target = { articleId?: string; commentId?: string; raceId?: string };

async function notify(type: NotificationType, userIds: Iterable<string>, actorId: string | null, target: Target) {
  const recipients = new Set(userIds);
  if (actorId) recipients.delete(actorId);
  if (recipients.size === 0) return;

  const already = await db.notification.findMany({
    where: { type, userId: { in: [...recipients] }, ...target },
    select: { userId: true },
  });
  for (const { userId } of already) recipients.delete(userId);

  await db.notification.createMany({
    data: [...recipients].map((userId) => ({ type, userId, actorId, ...target })),
  });
}

async function userIdsFor(usernames: string[]) {
  if (usernames.length === 0) return [];
  const users = await db.user.findMany({ where: { username: { in: usernames } }, select: { id: true } });
  return users.map((user) => user.id);
}

/** Drivers mentioned (or given a card) in a published article. Call after every save. */
export async function notifyArticleMentions(articleId: string, actorId: string) {
  const article = await db.article.findUnique({ where: { id: articleId }, select: { status: true, body: true } });
  if (article?.status !== "PUBLISHED") return;
  await notify("ARTICLE_MENTION", await userIdsFor(referencedUsernames(article.body)), actorId, { articleId });
}

/** A new comment: the author of the comment it replies to, and anyone it mentions. */
export async function notifyNewComment(commentId: string) {
  const comment = await db.articleComment.findUniqueOrThrow({
    where: { id: commentId },
    select: { articleId: true, authorId: true, body: true, parent: { select: { authorId: true } } },
  });
  const target = { articleId: comment.articleId, commentId };
  const replyTo = comment.parent?.authorId;
  if (replyTo) await notify("COMMENT_REPLY", [replyTo], comment.authorId, target);
  // The replied-to driver already has the reply notification
  const mentioned = (await userIdsFor(mentionedUsernames(comment.body))).filter((id) => id !== replyTo);
  await notify("COMMENT_MENTION", mentioned, comment.authorId, target);
}

/** Everyone with a result in a race that has just been finalized. */
export async function notifyRaceResults(raceId: string) {
  const results = await db.raceResult.findMany({ where: { raceId }, select: { userId: true } });
  await notify("RACE_RESULTS", results.map((r) => r.userId), null, { raceId });
}
