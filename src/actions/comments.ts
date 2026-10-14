"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { COMMENT_MAX } from "@/lib/articles";
import { db } from "@/lib/db";
import { parseForm, text, type FormState } from "@/lib/forms";
import { notifyNewComment } from "@/lib/notify";
import { getCurrentUser, isAdmin, requireUser } from "@/lib/session";

const commentSchema = z.object({
  body: text(COMMENT_MAX),
  parentId: z
    .string()
    .optional()
    .transform((value) => value || null),
});

/** Any logged-in driver can comment on a published article, or reply to a comment there. */
export async function addComment(articleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const article = await db.article.findUnique({ where: { id: articleId }, select: { status: true, slug: true } });
  if (!article || article.status !== "PUBLISHED") return { error: "Este artículo no admite comentarios." };
  const user = await requireUser(`/noticias/${article.slug}`);

  const parsed = parseForm(commentSchema, formData);
  if (!parsed.ok) return parsed.state;

  // Threads are one level deep: a reply to a reply joins the top-level comment's thread
  let parentId: string | null = null;
  if (parsed.data.parentId) {
    const parent = await db.articleComment.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, articleId: true, parentId: true },
    });
    if (!parent || parent.articleId !== articleId) return { error: "El comentario al que respondes ya no existe." };
    parentId = parent.parentId ?? parent.id;
  }

  const comment = await db.articleComment.create({
    data: { articleId, authorId: user.id, parentId, body: parsed.data.body },
  });
  await notifyNewComment(comment.id);
  refresh();
  return { message: "Comentario publicado." };
}

/** Drivers can delete their own comments; admins any. Replies go with it. */
export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  const comment = await db.articleComment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!user || !comment || (!isAdmin(user) && comment.authorId !== user.id)) return;

  await db.articleComment.delete({ where: { id: commentId } });
  refresh();
}
