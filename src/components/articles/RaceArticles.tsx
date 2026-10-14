import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listRaceArticles } from "@/lib/data/articles";
import { ArticleCategoryBadge } from "./ArticleCard";

/** Links to the articles about a race (previa, crónica…). Reads the DB: render inside <Suspense>. */
export async function RaceArticles({ raceId }: { raceId: string }) {
  const articles = await listRaceArticles(raceId);
  if (articles.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {articles.map((article) => (
        <li key={article.id}>
          <Link
            href={`/noticias/${article.slug}`}
            className="group flex items-center gap-3 bg-surface px-4 py-3 surface-panel clip-chamfer transition-colors hover:bg-surface-2"
          >
            <ArticleCategoryBadge category={article.category} />
            <span className="min-w-0 flex-1 truncate font-display text-lg font-bold uppercase italic group-hover:text-primary">
              {article.title}
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-fg-subtle group-hover:text-primary" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
