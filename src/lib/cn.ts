import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge needs to know our custom theme values (globals.css @theme)
 * so that e.g. `max-w-md` correctly overrides `max-w-page`.
 * Keep in sync when adding tokens.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "background",
        "surface",
        "surface-2",
        "border",
        "border-strong",
        "bar",
        "bar-fg",
        "fg",
        "fg-muted",
        "fg-subtle",
        "primary",
        "primary-hover",
        "primary-fg",
        "accent",
        "accent-hover",
        "accent-fg",
        "success",
        "warning",
        "danger",
        "danger-solid",
        "danger-solid-hover",
        "info",
        "gold",
        "silver",
        "bronze",
        "ring",
        "ring-contrast",
      ],
      radius: ["control", "card", "pill"],
      shadow: ["overlay"],
      container: ["page"],
      font: ["display"],
    },
  },
});

/** Merge class names, letting later Tailwind classes override earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
