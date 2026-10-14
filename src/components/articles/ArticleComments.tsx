import Link from "next/link";
import { Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/actions/comments";
import { mentionedUsernames } from "@/lib/articles";
import { getMentionedDrivers, listArticleComments, listMentionableDrivers } from "@/lib/data/articles";
import { formatDateTime } from "@/lib/format";
import { isAdmin, type CurrentUser } from "@/lib/session";
import { Avatar, Card, CardBody, ConfirmButton, Section } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { ArticleMarkdown } from "./ArticleMarkdown";
import { CommentForm } from "./CommentForm";

type ArticleCommentsProps = {
  article: { id: string; slug: string };
  /** Logged-in viewer, who can comment and delete their own comments */
  user: CurrentUser | null;
};

/** Flat comment thread under a published article, plus the box to add one. Reads the DB: render inside <Suspense>. */
export async function ArticleComments({ article, user }: ArticleCommentsProps) {
  const comments = await listArticleComments(article.id);
  const drivers = await getMentionedDrivers(mentionedUsernames(comments.map((c) => c.body).join("\n")));

  return (
    <Section id="comentarios" title={comments.length > 0 ? `Comentarios (${comments.length})` : "Comentarios"} className="scroll-mt-24">
      {comments.length === 0 ? (
        <p className="text-sm text-fg-muted">Nadie ha comentado todavía. ¡Abre la conversación!</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {comments.map((comment) => {
            const color = comment.author.favoriteColor?.hex;
            const canDelete = user != null && (user.id === comment.author.id || isAdmin(user));
            return (
              <li key={comment.id} id={`comentario-${comment.id}`} className="flex scroll-mt-24 gap-3 surface-panel clip-chamfer px-4 py-3">
                <Avatar name={comment.author.name} src={comment.author.image} color={color} className="shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                      <DriverName name={comment.author.name} username={comment.author.username} color={color} />
                      <a href={`#comentario-${comment.id}`} className="text-xs text-fg-subtle hover:underline">
                        <time dateTime={comment.createdAt.toISOString()}>{formatDateTime(comment.createdAt)}</time>
                      </a>
                    </div>
                    {canDelete && (
                      <form action={deleteComment.bind(null, comment.id)}>
                        <ConfirmButton
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="¿Eliminar el comentario?"
                          confirmLabel="Eliminar"
                        >
                          <Trash2 aria-label="Eliminar comentario" />
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                  <ArticleMarkdown variant="comment" text={comment.body} drivers={drivers} />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {user ? (
        <CommentForm action={addComment.bind(null, article.id)} drivers={await listMentionableDrivers()} />
      ) : (
        <Card>
          <CardBody className="text-sm text-fg-muted">
            <Link
              href={`/entrar?volver=${encodeURIComponent(`/noticias/${article.slug}#comentarios`)}`}
              className="font-semibold text-primary hover:underline"
            >
              Entra
            </Link>{" "}
            para dejar un comentario.
          </CardBody>
        </Card>
      )}
    </Section>
  );
}
