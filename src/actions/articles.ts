"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkbox, formValues, optionalText, parseForm, text, type FormState } from "@/lib/forms";
import { requireAdmin } from "@/lib/session";
import { notifyArticleMentions } from "@/lib/notify";
import { slugify } from "@/lib/slug";
import { deleteStoredFile, storeArticleImage, UploadError } from "@/lib/uploads";

const articleSchema = z.object({
  title: text(140),
  excerpt: optionalText(300),
  body: text(50_000),
  category: z.enum(["PREVIEW", "REPORT", "NEWS", "RULES"], { error: "Elige una categoría." }),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  raceId: optionalText(40),
  pinned: checkbox(),
});

/** Slug from the title, with -2, -3… when another article already has it. */
async function uniqueSlug(title: string, articleId?: string) {
  const base = slugify(title).slice(0, 80).replace(/-$/, "") || "articulo";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await db.article.findFirst({ where: { slug, id: { not: articleId } }, select: { id: true } });
    if (!taken) return slug;
  }
}

type CoverUpload = { ok: true; path: string | null } | { ok: false; state: FormState };

/** Stores the chosen cover image, if any. Call after validation so bad forms leave no files behind. */
async function uploadCover(formData: FormData): Promise<CoverUpload> {
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return { ok: true, path: null };
  try {
    return { ok: true, path: await storeArticleImage(file) };
  } catch (error) {
    if (error instanceof UploadError) {
      return { ok: false, state: { fieldErrors: { cover: error.message }, values: formValues(formData) } };
    }
    throw error;
  }
}

export async function createArticle(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parseForm(articleSchema, formData);
  if (!parsed.ok) return parsed.state;
  const cover = await uploadCover(formData);
  if (!cover.ok) return cover.state;

  const article = await db.article.create({
    data: {
      ...parsed.data,
      coverImage: cover.path,
      slug: await uniqueSlug(parsed.data.title),
      authorId: admin.id,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
  });
  await notifyArticleMentions(article.id, admin.id);
  redirect(`/admin/noticias/${article.id}`);
}

/** Saves and stays in the editor. The URL follows the title until the first publish, then it's frozen. */
export async function updateArticle(articleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parseForm(articleSchema, formData);
  if (!parsed.ok) return parsed.state;
  const cover = await uploadCover(formData);
  if (!cover.ok) return cover.state;

  const current = await db.article.findUniqueOrThrow({
    where: { id: articleId },
    select: { publishedAt: true, coverImage: true },
  });
  const publishedAt = current.publishedAt ?? (parsed.data.status === "PUBLISHED" ? new Date() : null);
  // A new upload replaces the cover; otherwise keep it unless asked to remove it
  const coverImage = cover.path ?? (formData.get("removeCover") === "on" ? null : current.coverImage);
  await db.article.update({
    where: { id: articleId },
    data: {
      ...parsed.data,
      coverImage,
      publishedAt,
      ...(!current.publishedAt && { slug: await uniqueSlug(parsed.data.title, articleId) }),
    },
  });
  if (current.coverImage && current.coverImage !== coverImage) await deleteStoredFile(current.coverImage);
  // Publishing, or adding someone to a published article, tells them
  await notifyArticleMentions(articleId, admin.id);

  refresh();
  // Don't echo "remove": the box would stay ticked next to a newly uploaded cover
  const values = formValues(formData);
  delete values.removeCover;
  return {
    message: parsed.data.status === "PUBLISHED" ? "Guardado y publicado." : "Borrador guardado.",
    values,
  };
}

export async function deleteArticle(articleId: string) {
  await requireAdmin();
  const article = await db.article.delete({ where: { id: articleId } });
  if (article.coverImage) await deleteStoredFile(article.coverImage);
  redirect("/admin/noticias");
}

/**
 * An image dropped, pasted or picked in the article editor. Uploaded right
 * away so it can be previewed; returns its URL for the Markdown.
 */
export async function uploadArticleImage(formData: FormData): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una imagen." };
  try {
    return { url: `/media/${await storeArticleImage(file)}` };
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }
}
