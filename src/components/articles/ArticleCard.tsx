import Link from "next/link";
import { MessageSquare, Pin } from "lucide-react";
import { ARTICLE_CATEGORY, plainExcerpt } from "@/lib/articles";
import type { ArticleListItem } from "@/lib/data/articles";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { raceTitle } from "@/lib/races";
import { Badge, SpeedStripes } from "@/components/ui";
import { FlagBackdrop } from "@/components/domain/CountryFlag";
import { t } from "@/i18n";

export function ArticleCategoryBadge({ category }: { category: ArticleListItem["category"] }) {
  const { label, tone } = ARTICLE_CATEGORY[category];
  return <Badge tone={tone}>{label}</Badge>;
}

const backdrop = {
  card: {
    flag: "absolute inset-0 opacity-50",
    stripes: "absolute inset-y-0 right-0 w-2/3 opacity-70",
    // Badges sit at the bottom left
    shade: "bg-linear-to-t from-black/60 via-black/20 to-transparent",
  },
  hero: {
    flag: "absolute inset-y-0 right-0 w-full opacity-40 sm:aspect-[2/1] sm:w-auto sm:max-w-full sm:opacity-50",
    stripes: "absolute inset-y-0 right-0 w-1/2 opacity-80",
    // The title runs across the left side
    shade: "bg-linear-to-r from-bar via-bar/75 to-bar/10",
  },
};

/**
 * Banner background: the cover image, else the race's flag, else racing
 * stripes. Position it inside a relative, overflow-hidden parent.
 */
export function ArticleBackdrop({
  article,
  variant,
}: {
  article: Pick<ArticleListItem, "coverImage" | "race">;
  variant: keyof typeof backdrop;
}) {
  const classes = backdrop[variant];
  if (article.coverImage) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
        <img src={`/media/${article.coverImage}`} alt="" className="absolute inset-0 size-full object-cover" />
        <div aria-hidden className={cn("absolute inset-0", classes.shade)} />
      </>
    );
  }
  if (article.race?.track.countryCode) return <FlagBackdrop code={article.race.track.countryCode} className={classes.flag} />;
  return <SpeedStripes className={classes.stripes} />;
}

type ArticleCardProps = {
  article: ArticleListItem;
  /** Bigger banner and title, for the lead story */
  featured?: boolean;
  /** Slim banner and shorter summary, for sidebars */
  compact?: boolean;
};

/** An article in a list: banner with the race's flag, category, title and summary. */
export function ArticleCard({ article, featured = false, compact = false }: ArticleCardProps) {
  const excerpt = article.excerpt ?? plainExcerpt(article.body);

  return (
    <article className="h-full">
      <Link
        href={`/noticias/${article.slug}`}
        className="group flex h-full flex-col surface-panel clip-chamfer transition-transform hover:-translate-y-0.5"
      >
        <div
          className={cn(
            "relative flex items-end overflow-hidden border-l-4 border-primary surface-bar px-5 py-4",
            featured ? "min-h-40 sm:min-h-52" : compact ? (article.coverImage ? "min-h-24 py-3" : "min-h-16 py-3") : "min-h-28",
          )}
        >
          <ArticleBackdrop article={article} variant="card" />
          <div className="relative flex flex-wrap items-center gap-2">
            <ArticleCategoryBadge category={article.category} />
            {article.race && <Badge tone="bar">{raceTitle(article.race)}</Badge>}
            {featured && article.pinned && (
              <Badge tone="bar">
                <Pin className="size-3" aria-hidden /> {t.articles.pinned}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 px-5 py-4">
          <h3 className={cn("group-hover:text-primary", featured ? "text-3xl sm:text-4xl" : compact ? "text-xl" : "text-2xl")}>
            {article.title}
          </h3>
          {excerpt && (
            <p className={cn("text-fg-muted", featured ? "text-base" : compact ? "line-clamp-2 text-sm" : "line-clamp-3 text-sm")}>
              {excerpt}
            </p>
          )}
          {article.publishedAt && (
            <p className="mt-auto flex items-center gap-3 pt-2 text-xs font-bold uppercase tracking-wider text-fg-subtle">
              <span className="min-w-0 flex-1">
                {formatDate(article.publishedAt)}
                {article.author && ` · ${article.author.name}`}
              </span>
              {article._count.comments > 0 && (
                <span className="flex shrink-0 items-center gap-1" title={t.articles.commentList.title}>
                  <MessageSquare className="size-3.5" aria-hidden /> {article._count.comments}
                  <span className="sr-only">{t.articles.commentList.title}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
