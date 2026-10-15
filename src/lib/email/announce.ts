import { db } from "@/lib/db";
import { formatDateTime, formatNames, formatRaceDay } from "@/lib/format";
import { raceTitle } from "@/lib/races";
import { absoluteUrl } from "@/lib/site-url";
import { sendToSubscribers } from "./send";
import { t } from "@/i18n";

/**
 * The emails sent to subscribers. Actions call these inside `after()` when
 * something happens for the first time; each one goes out once at most.
 */

/** Sign-ups just opened for a race. */
export async function announceSignupsOpen(raceId: string) {
  const race = await db.race.findUnique({
    where: { id: raceId },
    include: { track: { select: { name: true } }, season: { select: { name: true } } },
  });
  if (!race || race.status !== "OPEN") return;

  const title = raceTitle(race);
  await sendToSubscribers(`race-open:${raceId}`, "races", {
    subject: t.email.signupsOpenSubject(title),
    heading: t.email.signupsOpenSubject(title),
    paragraphs: [
      t.email.signupsOpenWhen(race.season.name, formatRaceDay(race.scheduledAt), race.location),
      t.email.signupsOpenSeats(race.maxPlayers, race.signupDeadline && formatDateTime(race.signupDeadline)),
      ...(race.notes ? [race.notes] : []),
    ],
    button: { label: t.email.signUp, url: absoluteUrl(`/carreras/${raceId}`) },
  });
}

/** A race's results were published. */
export async function announceResults(raceId: string) {
  const race = await db.race.findUnique({
    where: { id: raceId },
    include: {
      track: { select: { name: true } },
      results: { where: { position: { lte: 3 } }, orderBy: { position: "asc" }, select: { user: { select: { name: true } } } },
    },
  });
  if (!race || race.status !== "FINISHED") return;

  const [winner, ...podium] = race.results.map((result) => result.user.name);
  const title = raceTitle(race);
  await sendToSubscribers(`race-results:${raceId}`, "results", {
    subject: t.email.resultsSubject(title),
    heading: t.email.resultsSubject(title),
    paragraphs: [
      ...(winner ? [t.email.resultsWinner(winner)] : []),
      ...(podium.length > 0 ? [t.email.resultsPodium(formatNames(podium))] : []),
    ],
    button: { label: t.email.seeResults, url: absoluteUrl(`/carreras/${raceId}`) },
  });
}

/** An article was published for the first time. */
export async function announceArticle(articleId: string) {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article || article.status !== "PUBLISHED") return;

  await sendToSubscribers(`article:${articleId}`, "news", {
    subject: article.title,
    heading: article.title,
    paragraphs: article.excerpt ? [article.excerpt] : [],
    button: { label: t.email.readArticle, url: absoluteUrl(`/noticias/${article.slug}`) },
  });
}
