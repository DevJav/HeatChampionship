import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteArticle, updateArticle } from "@/actions/articles";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { EditCard } from "@/components/admin/EditCard";
import { ButtonLink } from "@/components/ui";
import { getArticle, getArticleEditorOptions } from "@/lib/data/articles";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Editar artículo · Admin" };

async function EditArticlePageContent({ params }: PageProps<"/admin/noticias/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/noticias/${id}`);
  const [article, options] = await Promise.all([getArticle(id), getArticleEditorOptions()]);
  if (!article) notFound();

  return (
    <EditCard
      title={article.title}
      actions={
        <div className="flex gap-1">
          <ButtonLink href={`/noticias/${article.slug}`} variant="inverse" size="sm">
            <ExternalLink /> Ver
          </ButtonLink>
          <DeleteForm action={deleteArticle.bind(null, id)} title="¿Eliminar el artículo?" />
        </div>
      }
    >
      <ArticleForm action={updateArticle.bind(null, id)} article={article} options={options} />
    </EditCard>
  );
}

export default function EditArticlePage(props: PageProps<"/admin/noticias/[id]">) {
  return (
    <AdminSuspense>
      <EditArticlePageContent {...props} />
    </AdminSuspense>
  );
}
