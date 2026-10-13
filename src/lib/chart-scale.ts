/** Chart scale helpers — pure, unit-tested in chart-scale.test.ts. */

/** Clean axis ticks (step 1, 2, 5, 10, 20, 50…) covering 0..value in about `count` steps. */
export function niceTicks(value: number, count = 4) {
  const rough = Math.max(value, 1) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  // Counts are whole numbers: never step below 1
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!);
  const max = Math.ceil(Math.max(value, 1) / step) * step;
  return Array.from({ length: max / step + 1 }, (_, i) => i * step);
}
