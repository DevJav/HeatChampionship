"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { COMMENT_MAX } from "@/lib/articles";
import { db } from "@/lib/db";
import { parseForm, text, type FormState } from "@/lib/forms";
import { getCurrentUser, isAdmin, requireUser } from "@/lib/session";

const commentSchema = z.object({ body: text(COMMENT_MAX) });

/** Any logged-in driver can comment on a published article. */
export async function addComment(articleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const article = await db.article.findUnique({ where: { id: articleId }, select: { status: true, slug: true } });
  if (!article || article.status !== "PUBLISHED") return { error: "Este artículo no admite comentarios." };
  const user = await requireUser(`/noticias/${article.slug}`);

  const parsed = parseForm(commentSchema, formData);
  if (!parsed.ok) return parsed.state;

  await db.articleComment.create({ data: { articleId, authorId: user.id, body: parsed.data.body } });
  refresh();
  return {};
}

/** Drivers can delete their own comments; admins any. */
export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  const comment = await db.articleComment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!user || !comment || (!isAdmin(user) && comment.authorId !== user.id)) return;

  await db.articleComment.delete({ where: { id: commentId } });
  refresh();
}
