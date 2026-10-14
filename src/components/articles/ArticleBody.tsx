import { Suspense } from "react";
import { mentionedUsernames, splitArticle } from "@/lib/articles";
import { getMentionedDrivers } from "@/lib/data/articles";
import { Skeleton } from "@/components/ui";
import { ArticleEmbed } from "./ArticleEmbeds";
import { ArticleMarkdown } from "./ArticleMarkdown";

type ArticleBodyProps = {
  /** Markdown with mentions and embeds */
  body: string;
  /** Editor preview: broken embeds explain themselves instead of hiding */
  preview?: boolean;
};

/** An article's text with its live embeds. Reads the DB and session: render inside <Suspense>. */
export async function ArticleBody({ body, preview = false }: ArticleBodyProps) {
  const segments = splitArticle(body);
  const text = segments.flatMap((segment) => (segment.type === "markdown" ? [segment.text] : [])).join("\n");
  const drivers = await getMentionedDrivers(mentionedUsernames(text));

  return (
    <div className="flex flex-col gap-6">
      {segments.map((segment, i) =>
        segment.type === "markdown" ? (
          <ArticleMarkdown key={i} text={segment.text} drivers={drivers} />
        ) : (
          <Suspense key={i} fallback={<Skeleton className="h-48 w-full" />}>
            <ArticleEmbed embed={segment.embed} preview={preview} />
          </Suspense>
        ),
      )}
    </div>
  );
}
