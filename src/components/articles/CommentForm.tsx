"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { COMMENT_MAX, type MentionCandidate } from "@/lib/articles";
import type { FormAction } from "@/lib/forms";
import { Alert, Button, SubmitButton } from "@/components/ui";
import { MentionTextarea } from "@/components/forms/MentionTextarea";

type CommentFormProps = {
  action: FormAction;
  drivers: MentionCandidate[];
  /** Replying: the comment answered (its thread gets the reply) */
  parentId?: string;
  /** Starting text, e.g. "@ana " when replying to Ana */
  initialText?: string;
  /** Focus the box with the cursor at the end (reply boxes open on demand) */
  autoFocus?: boolean;
  onPosted?: () => void;
  onCancel?: () => void;
};

/** Comment or reply box; it empties itself after posting. */
export function CommentForm({ action, drivers, parentId, initialText, autoFocus, onPosted, onCancel }: CommentFormProps) {
  const [state, formAction] = useActionState(action, {});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const error = state.fieldErrors?.body;

  useEffect(() => {
    const box = textarea.current;
    if (!autoFocus || !box) return;
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }, [autoFocus]);

  useEffect(() => {
    if (state.message) onPosted?.();
  }, [state, onPosted]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <MentionTextarea
        ref={textarea}
        drivers={drivers}
        name="body"
        rows={parentId ? 2 : 3}
        required
        maxLength={COMMENT_MAX}
        aria-label={parentId ? "Respuesta" : "Comentario"}
        aria-invalid={error ? true : undefined}
        placeholder={parentId ? "Escribe tu respuesta…" : "Escribe un comentario… Escribe @ para mencionar a alguien."}
        defaultValue={state.values?.body ?? initialText}
      />
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-fg-subtle">Admite **negrita**, *cursiva* y enlaces.</p>
        )}
        <div className="flex shrink-0 gap-1">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <SubmitButton size="sm">
            <Send /> {parentId ? "Responder" : "Comentar"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
