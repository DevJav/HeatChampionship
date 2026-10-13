/** Countdown maths — pure, unit-tested in countdown.test.ts. */

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

/** Whole days, hours, minutes and seconds left until `target` (all zero once it has passed). */
export function countdownParts(target: number, now: number): CountdownParts {
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}
