import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Newspaper } from "lucide-react";
import { Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { tabItemClass, tabListClass } from "@/components/ui/tabStyles";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ARTICLE_CATEGORIES, ARTICLE_CATEGORY, categoryFromParam } from "@/lib/articles";
import { listPublishedArticles } from "@/lib/data/articles";
import { t } from "@/i18n";

export const metadata: Metadata = {
  title: t.articles.title,
  description: t.articles.description,
};

const filters = [
  { label: t.articles.all, href: "/noticias", category: null },
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
      <nav className={tabListClass} aria-label={t.articles.categories}>
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
          title={t.articles.empty}
          description={t.articles.emptyDescription}
        />
      )}
    </div>
  );
}

export default function NewsPage({ searchParams }: PageProps<"/noticias">) {
  return (
    <Container>
      <PageHeader title={t.articles.title} description={t.articles.description} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewsView searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
