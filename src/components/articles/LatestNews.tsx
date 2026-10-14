import { ChevronRight } from "lucide-react";
import { listLatestArticles } from "@/lib/data/articles";
import { ButtonLink, Section } from "@/components/ui";
import { ArticleCard } from "./ArticleCard";

/**
 * The three newest articles: a column on wide screens, a row of cards on tablets.
 * Nothing until the first one is published. Reads the DB: render inside <Suspense>.
 */
export async function LatestNews() {
  const articles = await listLatestArticles(3);
  if (articles.length === 0) return null;

  return (
    <Section
      title="Noticias"
      actions={
        <ButtonLink href="/noticias" variant="secondary" size="sm">
          Ver todas <ChevronRight />
        </ButtonLink>
      }
    >
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} compact />
        ))}
      </div>
    </Section>
  );
}
