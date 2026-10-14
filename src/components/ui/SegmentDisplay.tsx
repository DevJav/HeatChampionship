import { cn } from "@/lib/cn";

/**
 * Seven-segment LED characters drawn as SVG, so unlit segments can show
 * faintly like on a real board. Colors come from the --led-* tokens.
 *
 *    a
 *  f   b
 *    g
 *  e   c
 *    d
 */
const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  " ": "",
};

// Digit cell 60×100: segments 9 thick with mitred ends and small gaps between them
const horizontal = (y: number) => `12.5,${y} 17,${y - 4.5} 43,${y - 4.5} 47.5,${y} 43,${y + 4.5} 17,${y + 4.5}`;
const vertical = (x: number, y1: number, y2: number) =>
  `${x},${y1 + 4.5} ${x + 4.5},${y1 + 9} ${x + 4.5},${y2 - 9} ${x},${y2 - 4.5} ${x - 4.5},${y2 - 9} ${x - 4.5},${y1 + 9}`;

const SEGMENTS: Record<string, string> = {
  a: horizontal(8),
  b: vertical(52, 8, 50),
  c: vertical(52, 50, 92),
  d: horizontal(92),
  e: vertical(8, 50, 92),
  f: vertical(8, 8, 50),
  g: horizontal(50),
};

// A tight hot core plus a wider bloom. Applied to a whole <svg>: on a shape inside
// one, Chrome clips the blur to the shape's box and the bloom shows square edges.
const glow = "drop-shadow(0 0 1.5px var(--led-on)) drop-shadow(0 0 1px var(--led-glow)) drop-shadow(0 0 6px var(--led-glow))";

function Digit({ char }: { char: string }) {
  const lit = DIGITS[char] ?? "";
  const segments = Object.entries(SEGMENTS);
  return (
    // Unlit segments underneath, lit ones (glowing) on a layer of their own
    <span className="relative flex h-full shrink-0 -skew-x-6" aria-hidden>
      <svg viewBox="0 0 60 100" className="h-full w-auto">
        {segments.map(([name, points]) => (lit.includes(name) ? null : <polygon key={name} points={points} fill="var(--led-off)" />))}
      </svg>
      <svg viewBox="0 0 60 100" className="absolute inset-0 h-full w-auto overflow-visible" style={{ filter: glow }}>
        {segments.map(([name, points]) => (lit.includes(name) ? <polygon key={name} points={points} fill="var(--led-on)" /> : null))}
      </svg>
    </span>
  );
}

function Colon() {
  return (
    <svg viewBox="0 0 20 100" className="h-full w-auto shrink-0 overflow-visible" style={{ filter: glow }} aria-hidden>
      <circle cx="10" cy="34" r="5" fill="var(--led-on)" />
      <circle cx="10" cy="68" r="5" fill="var(--led-on)" />
    </svg>
  );
}

/**
 * A row of LED characters: digits, "-", space and ":".
 * Size it with a height class (e.g. h-10); width follows.
 */
export function SegmentDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex gap-[0.12em]", className)}>
      {[...value].map((char, i) => (char === ":" ? <Colon key={i} /> : <Digit key={i} char={char} />))}
    </span>
  );
}
