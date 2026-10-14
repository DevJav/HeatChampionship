"use server";

import { requireAdmin } from "@/lib/session";
import { ArticleBody } from "@/components/articles/ArticleBody";

/** The editor's preview: the article rendered on the server, embeds included. */
export async function previewArticle(body: string) {
  await requireAdmin();
  return <ArticleBody body={body.slice(0, 50_000)} preview />;
}
