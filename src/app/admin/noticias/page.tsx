import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Pin, Plus } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { ArticleCategoryBadge } from "@/components/articles/ArticleCard";
import { ARTICLE_STATUS } from "@/lib/articles";
import { listAllArticles } from "@/lib/data/articles";
import { formatShortDate } from "@/lib/format";
import { raceTitle } from "@/lib/races";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Noticias · Admin" };

async function AdminArticlesPageContent() {
  await requireAdmin("/admin/noticias");
  const articles = await listAllArticles();

  return (
    <Section
      title="Noticias"
      actions={
        <ButtonLink href="/admin/noticias/nueva" size="sm">
          <Plus /> Nuevo artículo
        </ButtonLink>
      }
    >
      {articles.length === 0 ? (
        <EmptyState
          icon={<Newspaper />}
          title="Aún no hay artículos"
          description="Escribe previas, crónicas, novedades o el reglamento del campeonato."
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <Th>Título</Th>
                <Th>Categoría</Th>
                <Th className="max-md:hidden">Carrera</Th>
                <Th className="max-sm:hidden">Publicado</Th>
                <Th align="right">Estado</Th>
              </tr>
            </THead>
            <TBody>
              {articles.map((article) => {
                const { label, tone } = ARTICLE_STATUS[article.status];
                return (
                  <Tr key={article.id}>
                    <Td>
                      <span className="flex items-center gap-2">
                        {article.pinned && <Pin className="size-3.5 shrink-0 text-primary" aria-label="Destacado" />}
                        <Link href={`/admin/noticias/${article.id}`} className="font-semibold hover:text-primary hover:underline">
                          {article.title}
                        </Link>
                      </span>
                    </Td>
                    <Td>
                      <ArticleCategoryBadge category={article.category} />
                    </Td>
                    <Td className="text-fg-muted max-md:hidden">{article.race ? raceTitle(article.race) : "—"}</Td>
                    <Td className="text-fg-muted max-sm:hidden">
                      {article.publishedAt ? formatShortDate(article.publishedAt) : "—"}
                    </Td>
                    <Td align="right">
                      <Badge tone={tone}>{label}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </Section>
  );
}

export default function AdminArticlesPage() {
  return (
    <AdminSuspense>
      <AdminArticlesPageContent />
    </AdminSuspense>
  );
}
