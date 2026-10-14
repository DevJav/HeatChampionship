import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Newspaper } from "lucide-react";
import { Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { tabItemClass, tabListClass } from "@/components/ui/tabStyles";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ARTICLE_CATEGORIES, ARTICLE_CATEGORY, categoryFromParam } from "@/lib/articles";
import { listPublishedArticles } from "@/lib/data/articles";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Previas, crónicas, novedades y reglamento del campeonato.",
};

const filters = [
  { label: "Todo", href: "/noticias", category: null },
  ...ARTICLE_CATEGORIES.map((category) => ({
    label: ARTICLE_CATEGORY[category].plural,
    href: `/noticias?categoria=${ARTICLE_CATEGORY[category].param}`,
    category,
  })),
];

async function NewsView({ searchParams }: { searchParams: PageProps<"/noticias">["searchParams"] }) {
  const { categoria } = await searchParams;
  const category = categoryFromParam(categoria);
  const [lead, ...rest] = await listPublishedArticles({ category });

  return (
    <div className="flex flex-col gap-6">
      <nav className={tabListClass} aria-label="Categorías">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.category === category ? "page" : undefined}
            className={tabItemClass(filter.category === category)}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {lead ? (
        <>
          <ArticleCard article={lead} featured />
          {rest.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Newspaper />}
          title="Aún no hay artículos"
          description="Aquí aparecerán las previas, crónicas y novedades del campeonato."
        />
      )}
    </div>
  );
}

export default function NewsPage({ searchParams }: PageProps<"/noticias">) {
  return (
    <Container>
      <PageHeader title="Noticias" description="Previas, crónicas, novedades y reglamento del campeonato." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewsView searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
