import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { Alert, Badge, ButtonLink, ChequeredStrip, Container, Skeleton } from "@/components/ui";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleComments } from "@/components/articles/ArticleComments";
import { ArticleBackdrop, ArticleCategoryBadge } from "@/components/articles/ArticleCard";
import { ShareButtons } from "@/components/races/ShareButtons";
import { plainExcerpt } from "@/lib/articles";
import { getArticleBySlug, type ArticleListItem } from "@/lib/data/articles";
import { formatDate, plural } from "@/lib/format";
import { whatsappUrl } from "@/lib/race-share";
import { raceTitle } from "@/lib/races";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { absoluteUrl } from "@/lib/site-url";

export async function generateMetadata({ params }: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Noticias" };
  const description = article.excerpt ?? plainExcerpt(article.body);
  return {
    title: article.title,
    description,
    openGraph: {
      type: "article",
      title: article.title,
      description,
      publishedTime: article.publishedAt?.toISOString(),
      // WhatsApp and friends show the cover, else the site's card (setting openGraph here drops the inherited one)
      images: [absoluteUrl(article.coverImage ? `/media/${article.coverImage}` : "/opengraph-image")],
    },
  };
}

function ArticleHero({ article, admin }: { article: ArticleListItem; admin: boolean }) {
  const url = absoluteUrl(`/noticias/${article.slug}`);

  return (
    <header className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
      <ArticleBackdrop article={article} variant="hero" />
      <div className="relative flex flex-col items-start gap-3 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap gap-2">
          <ArticleCategoryBadge category={article.category} />
          {article.race && (
            <Link href={`/carreras/${article.race.id}`} className="hover:brightness-125">
              <Badge tone="bar">{raceTitle(article.race)}</Badge>
            </Link>
          )}
        </div>
        <h1 className="max-w-4xl text-4xl [text-shadow:0_2px_12px_rgb(0_0_0/0.5)] sm:text-6xl">{article.title}</h1>
        {article.excerpt && <p className="max-w-3xl text-lg text-bar-fg/85">{article.excerpt}</p>}
        <p className="text-sm text-bar-fg/70">
          {article.publishedAt ? formatDate(article.publishedAt) : "Sin publicar"}
          {article.author && ` · ${article.author.name}`}
          {article.status === "PUBLISHED" && (
            <>
              {" · "}
              <a href="#comentarios" className="hover:text-bar-fg hover:underline">
                {plural(article._count.comments, "comentario", "comentarios")}
              </a>
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {article.status === "PUBLISHED" && <ShareButtons whatsappHref={whatsappUrl(`${article.title}\n${url}`)} url={url} />}
          {admin && (
            <ButtonLink href={`/admin/noticias/${article.id}`} variant="inverse" size="sm">
              <Pencil /> Editar
            </ButtonLink>
          )}
        </div>
      </div>
      <ChequeredStrip className="relative text-bar-fg/80" />
    </header>
  );
}

async function ArticleView({ params }: { params: PageProps<"/noticias/[slug]">["params"] }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const article = await getArticleBySlug(slug, { includeDraft: admin });
  if (!article) notFound();

  return (
    <article className="flex flex-col gap-8">
      {article.status === "DRAFT" && <Alert tone="warning">Borrador: solo lo ven los administradores.</Alert>}
      <ArticleHero article={article} admin={admin} />
      <div className="mx-auto w-full max-w-3xl">
        <ArticleBody body={article.body} />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 border-t border-border pt-6">
        {article.status === "PUBLISHED" && <ArticleComments article={article} user={user} />}
        <ButtonLink href="/noticias" variant="secondary" size="sm" className="self-start">
          <ChevronLeft /> Todas las noticias
        </ButtonLink>
      </div>
    </article>
  );
}

export default function ArticlePage({ params }: PageProps<"/noticias/[slug]">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ArticleView params={params} />
      </Suspense>
    </Container>
  );
}
