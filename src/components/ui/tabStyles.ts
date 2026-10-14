import { cn } from "@/lib/cn";

// Plain module (not "use client") so server components can style tabs too.

/** Shared tab look: Tabs, LinkTabs and query-string filters. */
export function tabItemClass(selected: boolean) {
  return cn(
    "whitespace-nowrap px-5 py-2 font-display text-sm font-bold uppercase italic tracking-wide transition-colors clip-slant focus-inset",
    selected ? "bg-primary text-primary-fg gloss" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
  );
}

export const tabListClass = "flex gap-1 overflow-x-auto border-b-2 border-primary";
