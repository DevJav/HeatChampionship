"use client";

import { useCallback, useState } from "react";
import { Reply } from "lucide-react";
import type { MentionCandidate } from "@/lib/articles";
import type { FormAction } from "@/lib/forms";
import { Button } from "@/components/ui";
import { CommentForm } from "./CommentForm";

type CommentReplyProps = {
  action: FormAction;
  drivers: MentionCandidate[];
  /** The comment answered */
  parentId: string;
  /** Username of whoever is being answered, mentioned at the start of the reply */
  mention: string | null;
};

/** "Responder" link that opens a reply box below the comment. */
export function CommentReply({ action, drivers, parentId, mention }: CommentReplyProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-7 self-start px-2 text-xs">
        <Reply /> Responder
      </Button>
    );
  }
  return (
    <div className="pt-1">
      <CommentForm
        action={action}
        drivers={drivers}
        parentId={parentId}
        initialText={mention ? `@${mention} ` : undefined}
        autoFocus
        onPosted={close}
        onCancel={close}
      />
    </div>
  );
}
