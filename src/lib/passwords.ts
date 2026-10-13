import { randomInt } from "node:crypto";

const WORDS = [
  "curva", "rebufo", "calor", "marcha", "recta", "boxes", "motor", "turbo",
  "chicane", "meta", "podio", "vuelta", "parrilla", "garaje", "frenada", "bandera",
];

/**
 * A temporary password that's easy to read out or send by message,
 * e.g. "rebufo-curva-47". `pick` is injectable for tests.
 */
export function temporaryPassword(pick: (max: number) => number = randomInt) {
  const word = () => WORDS[pick(WORDS.length)];
  return `${word()}-${word()}-${String(pick(100)).padStart(2, "0")}`;
}
