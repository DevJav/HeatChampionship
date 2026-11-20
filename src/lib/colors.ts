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

function contrast(a: number, b: number) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function mix(hex: string, target: string, amount: number) {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.replace("#", "").padStart(6, "0").slice(i - 1, i + 1), 16));
  const [a, b] = [parse(hex), parse(target)];
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("")}`;
}

const SURFACE = "#f8f8f9";
const BAR = "#111214";
const INK = "#111214";

/** Steps `hex` toward `target` until `ok` holds (or it gets there). */
function nudge(hex: string, target: string, ok: (color: string) => boolean) {
  let color = hex;
  for (let step = 1; step <= 10 && !ok(color); step++) color = mix(hex, target, step * 0.1);
  return color;
}

/**
 * Theme overrides that turn a car color into the page's brand color (the red
 * "primary" tokens). Fills keep the car color itself, so yellow stays yellow;
 * only white is greyed until it shows on the light panels and black is lifted
 * to graphite until it shows on the dark bars. Text and icons ("--primary-ink")
 * use the car color when it reads on the panels and plain ink when it doesn't.
 */
export function accentTokens(hex: string): Record<string, string> {
  if (!/^#?[0-9a-f]{6}$/i.test(hex)) return {};
  const car = hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
  const surface = luminance(SURFACE);
  const bar = luminance(BAR);
  let fill = nudge(car, INK, (c) => contrast(luminance(c), surface) >= 1.3);
  fill = nudge(fill, "#ffffff", (c) => contrast(luminance(c), bar) >= 2.2);
  const ink = contrast(luminance(car), surface) >= 3 ? car : INK;
  return {
    "--primary": fill,
    "--primary-hover": mix(fill, "#000000", 0.12),
    "--primary-fg": readableTextOn(fill),
    "--primary-ink": ink,
    "--ring": ink,
  };
}
