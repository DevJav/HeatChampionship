import { cn } from "@/lib/cn";

/** Shared look for menu items on the dark broadcast bar (desktop and mobile). */
export function navItemClass(active = false) {
  return cn(
    "flex items-center gap-2 px-4 py-2 font-display text-sm font-bold uppercase italic tracking-wide transition-colors clip-slant focus-inset [&_svg]:size-4",
    active
      ? "bg-primary text-primary-fg gloss"
      : "text-bar-fg/70 hover:bg-white/10 hover:text-bar-fg",
  );
}
