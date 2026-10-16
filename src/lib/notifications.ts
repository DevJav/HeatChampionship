import type { NotificationType } from "@/generated/prisma/client";
import { raceTitle } from "./races";
import { t } from "@/i18n";

/** A stored notification with what's needed to describe it (see lib/data/notifications.ts). */
export type NotificationRecord = {
  type: NotificationType;
  actor: { name: string } | null;
  article: { slug: string; title: string } | null;
  commentId: string | null;
  race: { id: string; round: number; track: { name: string }; results: { position: number; points: number }[] } | null;
  /** The recipient caused it themselves (they won the Driver of the Day vote) */
  aboutYou?: boolean;
};

/** Sentence and link for a notification. Built when shown, so edited results or titles stay current. */
export function describeNotification(n: NotificationRecord): { message: string; href: string } {
  const who = n.actor?.name ?? t.notifications.someone;
  const title = n.article ? t.notifications.quoted(n.article.title) : t.notifications.anArticle;
  const articleHref = n.article ? `/noticias/${n.article.slug}` : "/noticias";
  const commentHref = n.commentId ? `${articleHref}#comentario-${n.commentId}` : articleHref;

  switch (n.type) {
    case "ARTICLE_MENTION":
      return { message: t.notifications.articleMention(who, title), href: articleHref };
    case "COMMENT_MENTION":
      return { message: t.notifications.commentMention(who, title), href: commentHref };
    case "COMMENT_REPLY":
      return { message: t.notifications.commentReply(who, title), href: commentHref };
    case "DRIVER_OF_THE_DAY": {
      const race = n.race ? raceTitle(n.race) : "";
      const href = n.race ? `/carreras/${n.race.id}` : "/carreras";
      return { message: n.aboutYou ? t.notifications.dotdYou(race) : t.notifications.dotd(who, race), href };
    }
    case "RACE_RESULTS": {
      if (!n.race) return { message: t.notifications.resultsGeneric, href: "/carreras" };
      const result = n.race.results[0];
      const finish = result ? t.notifications.yourFinish(t.common.ordinal(result.position), result.points) : "";
      return { message: `${t.notifications.results(raceTitle(n.race))}${finish}`, href: `/carreras/${n.race.id}` };
    }
  }
}
