import type { CSSProperties } from "react";

/**
 * Left/right side bearings of Titillium Web Bold Italic digits, in 1/1000 em.
 * Every digit is 560 wide (tabular), so a thin "1" carries a wide left gap, and
 * the slant makes most digits overhang their right edge (negative bearing).
 */
const DIGIT_BEARINGS: Record<string, readonly [number, number]> = {
  "0": [95, -57],
  "1": [194, -8],
  "2": [63, -42],
  "3": [59, -40],
  "4": [70, -12],
  "5": [62, -81],
  "6": [99, -80],
  "7": [117, -76],
  "8": [65, -78],
  "9": [79, -45],
};

/**
 * Trailing padding (in em) that optically centers a bold italic number: the ink
 * sits (lsb − rsb) / 2 off the advance box, so padding the end by twice that
 * recenters it. Null when the text doesn't start and end with a digit.
 */
export function italicCenterPad(text: string): number | null {
  const first = DIGIT_BEARINGS[text[0] ?? ""];
  const last = DIGIT_BEARINGS[text[text.length - 1] ?? ""];
  if (!first || !last) return null;
  return (first[0] - last[1]) / 1000;
}

/** Style for an `italic-center` element showing this text: exact padding for numbers */
export function italicCenterStyle(text: string | number): CSSProperties | undefined {
  const pad = italicCenterPad(String(text));
  return pad == null ? undefined : ({ "--italic-pad": `${pad}em` } as CSSProperties);
}
