import type { Metadata } from "next";
import { createArticle } from "@/actions/articles";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { EditCard } from "@/components/admin/EditCard";
import { getArticleEditorOptions } from "@/lib/data/articles";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Nuevo artículo · Admin" };

async function NewArticlePageContent() {
  await requireAdmin("/admin/noticias/nueva");
  const options = await getArticleEditorOptions();
  return (
    <EditCard title="Nuevo artículo">
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
