import { connection } from "next/server";
import type { ArticleCategory, Prisma } from "@/generated/prisma/client";
import type { MentionCandidate } from "../articles";
import { db } from "../db";

const articleListInclude = {
  author: { select: { name: true, username: true } },
  race: {
    select: { id: true, round: true, scheduledAt: true, track: { select: { name: true, countryCode: true } } },
  },
  _count: { select: { comments: true } },
} satisfies Prisma.ArticleInclude;

export type ArticleListItem = Prisma.ArticleGetPayload<{ include: typeof articleListInclude }>;

const published = { status: "PUBLISHED" } satisfies Prisma.ArticleWhereInput;

/** Published articles, pinned first, then newest. */
export async function listPublishedArticles({ category, limit }: { category?: ArticleCategory | null; limit?: number } = {}) {
  await connection();
  return db.article.findMany({
    where: { ...published, ...(category && { category }) },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    include: articleListInclude,
    take: limit,
  });
}

/** Newest published articles, ignoring pins (home page). */
export async function listLatestArticles(limit: number) {
  await connection();
  return db.article.findMany({
    where: published,
    orderBy: { publishedAt: "desc" },
    include: articleListInclude,
    take: limit,
  });
}

/** Published articles about a race, oldest first (previa before crónica). */
export async function listRaceArticles(raceId: string) {
  await connection();
  return db.article.findMany({
    where: { ...published, raceId },
    orderBy: { publishedAt: "asc" },
    select: { id: true, slug: true, title: true, category: true },
  });
}

/** An article by URL. Drafts are only returned when `includeDraft`. */
export async function getArticleBySlug(slug: string, { includeDraft = false } = {}) {
  await connection();
  const article = await db.article.findUnique({ where: { slug }, include: articleListInclude });
  if (!article || (article.status === "DRAFT" && !includeDraft)) return null;
  return article;
}

/** An article's comments, oldest first. */
export async function listArticleComments(articleId: string) {
  await connection();
  return db.articleComment.findMany({
    where: { articleId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      parentId: true,
      body: true,
      createdAt: true,
      author: {
        select: { id: true, name: true, username: true, image: true, favoriteColor: { select: { hex: true } } },
      },
    },
  });
}

export type ArticleComment = Awaited<ReturnType<typeof listArticleComments>>[number];

/** Display data for the drivers mentioned in an article, by lowercased username. */
export async function getMentionedDrivers(usernames: string[]) {
  await connection();
  if (usernames.length === 0) return new Map<string, MentionedDriver>();
  const users = await db.user.findMany({
    where: { username: { in: usernames } },
    select: { name: true, username: true, favoriteColor: { select: { hex: true } } },
  });
  return new Map(users.map((user) => [user.username!, user]));
}

/** Every driver, for the "@" suggestions while writing. */
export async function listMentionableDrivers(): Promise<MentionCandidate[]> {
  await connection();
  const users = await db.user.findMany({
    where: { username: { not: null } },
    orderBy: { name: "asc" },
    select: { name: true, username: true, favoriteColor: { select: { hex: true } } },
  });
  return users.map((user) => ({ name: user.name, username: user.username!, color: user.favoriteColor?.hex ?? null }));
}

export type MentionedDriver = { name: string; username: string | null; favoriteColor: { hex: string } | null };

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listAllArticles() {
  await connection();
  return db.article.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: articleListInclude,
  });
}

export async function getArticle(id: string) {
  await connection();
  return db.article.findUnique({ where: { id } });
}

/** Choices for the editor's pickers: drivers, races and seasons. */
export async function getArticleEditorOptions() {
  await connection();
  const [drivers, races, seasons] = await Promise.all([
    listMentionableDrivers(),
    db.race.findMany({
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true,
        round: true,
        status: true,
        scheduledAt: true,
        track: { select: { name: true } },
        season: { select: { name: true } },
      },
    }),
    db.season.findMany({
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, status: true },
    }),
  ]);
  return { drivers, races, seasons };
}

export type ArticleEditorOptions = Awaited<ReturnType<typeof getArticleEditorOptions>>;
