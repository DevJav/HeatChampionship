import Link from "next/link";
import { Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/actions/comments";
import { mentionedUsernames, type MentionCandidate } from "@/lib/articles";
import {
  getMentionedDrivers,
  listArticleComments,
  listMentionableDrivers,
  type ArticleComment,
  type MentionedDriver,
} from "@/lib/data/articles";
import type { FormAction } from "@/lib/forms";
import { formatDateTime, plural } from "@/lib/format";
import { isAdmin, type CurrentUser } from "@/lib/session";
import { Avatar, Card, CardBody, ConfirmButton, Section } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { ArticleMarkdown } from "./ArticleMarkdown";
import { CommentForm } from "./CommentForm";
import { CommentReply } from "./CommentReply";

type ThreadContext = {
  user: CurrentUser | null;
  /** Mentioned drivers across the thread, for the chips */
  mentioned: ReadonlyMap<string, MentionedDriver>;
  /** Logged in: the action and "@" suggestions for replying */
  reply: { action: FormAction; drivers: MentionCandidate[] } | null;
};

function CommentCard({
  comment,
  threadId,
  replies = 0,
  context,
}: {
  comment: ArticleComment;
  /** The top-level comment of this thread: replies to replies join it */
  threadId: string;
  /** Replies deleted along with it */
  replies?: number;
  context: ThreadContext;
}) {
  const { user, mentioned, reply } = context;
  const color = comment.author.favoriteColor?.hex;
  const canDelete = user != null && (user.id === comment.author.id || isAdmin(user));

  return (
    <div
      id={`comentario-${comment.id}`}
      // Opened from a notification (#comentario-…): tint it so it's easy to spot
      className="flex scroll-mt-24 gap-3 surface-panel clip-chamfer px-4 py-3 target:bg-primary/10"
    >
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
                description={replies > 0 ? `También se borrarán sus ${plural(replies, "respuesta", "respuestas")}.` : undefined}
                confirmLabel="Eliminar"
              >
                <Trash2 aria-label="Eliminar comentario" />
              </ConfirmButton>
            </form>
          )}
        </div>
        <ArticleMarkdown variant="comment" text={comment.body} drivers={mentioned} />
        {reply && (
          <CommentReply
            action={reply.action}
            drivers={reply.drivers}
            parentId={threadId}
            // No need to mention yourself when answering your own comment
            mention={comment.author.id === user?.id ? null : comment.author.username}
          />
        )}
      </div>
    </div>
  );
}

type ArticleCommentsProps = {
  article: { id: string; slug: string };
  /** Logged-in viewer, who can comment, reply and delete their own comments */
  user: CurrentUser | null;
};

/** Comment threads under a published article (replies one level deep), plus the box to add one. Reads the DB: render inside <Suspense>. */
export async function ArticleComments({ article, user }: ArticleCommentsProps) {
  const [comments, drivers] = await Promise.all([
    listArticleComments(article.id),
    user ? listMentionableDrivers() : [],
  ]);
  const mentioned = await getMentionedDrivers(mentionedUsernames(comments.map((c) => c.body).join("\n")));
  const action = addComment.bind(null, article.id);
  const context: ThreadContext = { user, mentioned, reply: user ? { action, drivers } : null };

  const threads = comments.filter((c) => !c.parentId);
  const repliesOf = new Map<string, ArticleComment[]>();
  for (const comment of comments) {
    if (comment.parentId) repliesOf.set(comment.parentId, [...(repliesOf.get(comment.parentId) ?? []), comment]);
  }

  return (
    <Section id="comentarios" title={comments.length > 0 ? `Comentarios (${comments.length})` : "Comentarios"} className="scroll-mt-24">
      {threads.length === 0 ? (
        <p className="text-sm text-fg-muted">Nadie ha comentado todavía. ¡Abre la conversación!</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {threads.map((thread) => {
            const replies = repliesOf.get(thread.id) ?? [];
            return (
              <li key={thread.id} className="flex flex-col gap-2">
                <CommentCard comment={thread} threadId={thread.id} replies={replies.length} context={context} />
                {replies.length > 0 && (
                  <ol className="flex flex-col gap-2 border-l-2 border-border pl-3 sm:ml-6 sm:pl-4">
                    {replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentCard comment={reply} threadId={thread.id} context={context} />
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {user ? (
        <CommentForm action={action} drivers={drivers} />
      ) : (
        <Card>
          <CardBody className="text-sm text-fg-muted">
            <Link
              href={`/entrar?volver=${encodeURIComponent(`/noticias/${article.slug}#comentarios`)}`}
              className="font-semibold text-primary hover:underline"
            >
              Entra
            </Link>{" "}
            para comentar y responder.
          </CardBody>
        </Card>
      )}
    </Section>
  );
}
