/** Color helpers for user-chosen colors (car colors), not theme tokens. */

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a "#rrggbb" color (0 = black, 1 = white). */
export function luminance(hex: string) {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return 0;
  const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on top of `hex`. */
export function readableTextOn(hex: string) {
  const l = luminance(hex);
  // Contrast against white vs against black
  return (1.05) / (l + 0.05) >= (l + 0.05) / 0.05 ? "#ffffff" : "#111214";
}

/** Very light colors need an outline to stand out on light backgrounds. */
export function needsOutline(hex: string) {
  return luminance(hex) > 0.7;
}
