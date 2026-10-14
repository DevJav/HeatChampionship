"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { COMMENT_MAX, type MentionCandidate } from "@/lib/articles";
import type { FormAction } from "@/lib/forms";
import { Alert, SubmitButton } from "@/components/ui";
import { MentionTextarea } from "@/components/forms/MentionTextarea";

/** New comment box; it empties itself after posting. */
export function CommentForm({ action, drivers }: { action: FormAction; drivers: MentionCandidate[] }) {
  const [state, formAction] = useActionState(action, {});
  const error = state.fieldErrors?.body;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <MentionTextarea
        drivers={drivers}
        name="body"
        rows={3}
        required
        maxLength={COMMENT_MAX}
        aria-label="Comentario"
        aria-invalid={error ? true : undefined}
        placeholder="Escribe un comentario… Escribe @ para mencionar a alguien."
        defaultValue={state.values?.body}
      />
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-fg-subtle">Admite **negrita**, *cursiva* y enlaces.</p>
        )}
        <SubmitButton size="sm">
          <Send /> Comentar
        </SubmitButton>
      </div>
    </form>
  );
}
