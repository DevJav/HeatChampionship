import type { Metadata } from "next";
import { createArticle } from "@/actions/articles";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { EditCard } from "@/components/admin/EditCard";
import { getArticleEditorOptions } from "@/lib/data/articles";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.articles.new) };

async function NewArticlePageContent() {
  await requireAdmin("/admin/noticias/nueva");
  const options = await getArticleEditorOptions();
  return (
    <EditCard title={t.admin.articles.new}>
      <ArticleForm action={createArticle} options={options} />
    </EditCard>
  );
}

export default function NewArticlePage() {
  return (
    <AdminSuspense>
      <NewArticlePageContent />
    </AdminSuspense>
  );
}
