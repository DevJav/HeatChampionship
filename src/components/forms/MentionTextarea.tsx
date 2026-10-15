"use client";

import { useEffect, useId, useRef, useState } from "react";
import { filterMentionCandidates, mentionQueryAt, type MentionCandidate } from "@/lib/articles";
import { cn } from "@/lib/cn";
import { needsOutline } from "@/lib/colors";
import { Textarea } from "@/components/ui";
import { caretPosition, replaceSelection } from "./textareaEdit";
import { t } from "@/i18n";

const LIST_WIDTH = 256;

type Suggesting = {
  /** Index of the "@" being completed */
  start: number;
  query: string;
  /** Where the list goes, in pixels from the textarea's top-left */
  top: number;
  left: number;
};

type MentionTextareaProps = React.ComponentProps<typeof Textarea> & {
  /** Drivers offered after typing "@" */
  drivers: MentionCandidate[];
};

/**
 * A textarea that suggests drivers after "@": filter by typing their name,
 * ↑/↓ to move, Enter or Tab to insert "@username", Esc to dismiss.
 */
export function MentionTextarea({ drivers, ref, onKeyDown, onSelect, onInput, onBlur, ...props }: MentionTextareaProps) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const [suggesting, setSuggesting] = useState<Suggesting | null>(null);
  const [active, setActive] = useState(0);
  // Esc closes the list until the caret leaves that mention
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const listId = useId();

  const matches = suggesting ? filterMentionCandidates(drivers, suggesting.query) : [];
  const open = matches.length > 0;
  const activeIndex = Math.min(active, matches.length - 1);
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    if (open) document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
  });

  /** Re-read the text before the caret: is a mention being typed? */
  function update() {
    const textarea = inner.current;
    const found =
      textarea && textarea.selectionStart === textarea.selectionEnd
        ? mentionQueryAt(textarea.value.slice(0, textarea.selectionStart))
        : null;
    if (!textarea || !found || found.start === dismissedAt) {
      setSuggesting(null);
      if (!found) setDismissedAt(null);
      return;
    }
    if (found.start !== suggesting?.start || found.query !== suggesting.query) setActive(0);
    const caret = caretPosition(textarea, found.start);
    setSuggesting({
      ...found,
      top: Math.min(caret.top + caret.lineHeight + 4, textarea.offsetHeight),
      left: Math.max(0, Math.min(caret.left, textarea.clientWidth - LIST_WIDTH)),
    });
  }

  function choose(driver: MentionCandidate) {
    const textarea = inner.current;
    if (!textarea || !suggesting) return;
    textarea.setSelectionRange(suggesting.start, textarea.selectionStart);
    replaceSelection(textarea, `@${driver.username} `);
    setSuggesting(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (!open || event.defaultPrevented) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + matches.length) % matches.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDismissedAt(suggesting!.start);
      setSuggesting(null);
    }
  }

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={(node) => {
          inner.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        onKeyDown={handleKeyDown}
        // Typing, clicking or arrowing into "@…" (re)opens the list
        onInput={(event) => {
          onInput?.(event);
          update();
        }}
        onSelect={(event) => {
          onSelect?.(event);
          update();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          setSuggesting(null);
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.forms.mentionSuggestions}
          className="absolute z-30 max-h-64 overflow-y-auto border border-border surface-panel py-1 shadow-overlay"
          style={{ top: suggesting!.top, left: suggesting!.left, width: LIST_WIDTH }}
        >
          {matches.map((driver, index) => (
            <li
              key={driver.username}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              // Keep focus in the textarea, so the caret stays where the mention goes
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(driver)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm",
                index === activeIndex && "bg-primary/15",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-4 w-1 shrink-0 -skew-x-12 bg-border-strong",
                  driver.color && needsOutline(driver.color) && "ring-1 ring-border-strong",
                )}
                style={driver.color ? { backgroundColor: driver.color } : undefined}
              />
              <span className="truncate font-semibold">{driver.name}</span>
              <span className="ml-auto truncate text-xs text-fg-subtle">@{driver.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
