"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { SmilePlus } from "lucide-react";
import { toggleReaction } from "@/actions/comments";
import { cn } from "@/lib/cn";
import { DEFAULT_REACTIONS, parseReaction, type ReactionGroup } from "@/lib/reactions";
import { t } from "@/i18n";

type CommentReactionsProps = {
  commentId: string;
  reactions: ReactionGroup[];
  /** Logged in: chips can be tapped and the picker is shown */
  canReact: boolean;
  /** Your name, for the tooltip while a reaction is saving */
  me: string | null;
};

/** Emoji chips under a comment: tap one to add or take off yours, or pick any emoji with the smiley button. */
export function CommentReactions({ commentId, reactions, canReact, me }: CommentReactionsProps) {
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const [groups, toggle] = useOptimistic(reactions, (current, emoji: string) => {
    const group = current.find((g) => g.emoji === emoji);
    if (!group) return [...current, { emoji, count: 1, mine: true, names: me ? [me] : [] }];
    if (!group.mine) return current.map((g) => (g === group ? { ...g, count: g.count + 1, mine: true, names: [...g.names, ...(me ? [me] : [])] } : g));
    if (group.count === 1) return current.filter((g) => g !== group);
    return current.map((g) => (g === group ? { ...g, count: g.count - 1, mine: false, names: g.names.filter((n) => n !== me) } : g));
  });

  const react = (emoji: string) =>
    startTransition(async () => {
      toggle(emoji);
      setError(undefined);
      const result = await toggleReaction(commentId, emoji);
      if (result.error) setError(result.error);
    });

  if (groups.length === 0 && !canReact) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.map((group) => {
        const title = t.articles.reactions.who(group.names, group.emoji);
        const chip = (
          <>
            <span className="text-base leading-none">{group.emoji}</span>
            <span className="tabular-nums">{group.count}</span>
          </>
        );
        const chipClass = cn(
          "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-semibold",
          group.mine ? "border-primary bg-primary/15 text-fg" : "border-border bg-surface-2 text-fg-muted",
        );
        return canReact ? (
          <button
            key={group.emoji}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={group.mine}
            onClick={() => react(group.emoji)}
            className={cn(chipClass, "transition-colors hover:border-primary focus-inset")}
          >
            {chip}
          </button>
        ) : (
          <span key={group.emoji} title={title} className={chipClass}>
            {chip}
          </span>
        );
      })}
      {canReact && <ReactionPicker onPick={react} mine={new Set(groups.filter((g) => g.mine).map((g) => g.emoji))} />}
      {error && <p role="alert" className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}

function ReactionPicker({ onPick, mine }: { onPick: (emoji: string) => void; mine: ReadonlySet<string> }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [invalid, setInvalid] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (emoji: string) => {
    onPick(emoji);
    setOpen(false);
    setCustom("");
    setInvalid(false);
  };

  const submitCustom = (event: React.FormEvent) => {
    event.preventDefault();
    const emoji = parseReaction(custom);
    if (emoji) pick(emoji);
    else setInvalid(true);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t.articles.reactions.add}
        title={t.articles.reactions.add}
        className="inline-flex h-7 items-center rounded-full border border-dashed border-border px-2 text-fg-subtle transition-colors hover:border-primary hover:text-fg focus-inset [&_svg]:size-4"
      >
        <SmilePlus />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-1 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-2 border border-border bg-surface p-2 shadow-lg">
          <div className="grid grid-cols-8 gap-0.5">
            {DEFAULT_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => pick(emoji)}
                aria-pressed={mine.has(emoji)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded text-xl transition-transform hover:scale-125 hover:bg-surface-2 focus-inset",
                  mine.has(emoji) && "bg-primary/15",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={submitCustom} className="flex gap-1">
            <input
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setInvalid(false);
              }}
              aria-label={t.articles.reactions.custom}
              aria-invalid={invalid}
              placeholder={t.articles.reactions.customPlaceholder}
              maxLength={32}
              className="h-8 min-w-0 flex-1 border border-border bg-surface-2 px-2 text-sm aria-invalid:border-danger"
            />
            <button type="submit" className="h-8 bg-primary px-3 text-xs font-bold text-primary-fg uppercase hover:bg-primary-hover">
              {t.articles.reactions.customAdd}
            </button>
          </form>
          {invalid && <p className="text-xs text-danger">{t.articles.reactions.notEmoji}</p>}
        </div>
      )}
    </div>
  );
}
