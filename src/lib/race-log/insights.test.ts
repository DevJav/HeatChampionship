import { describe, expect, it } from "vitest";
import { driverInsights, rankHistory } from "./insights";
import type { LoggedRound } from "./rounds";
import { usaLayout as usa } from "./usa";

const rounds: LoggedRound[] = [
  { positions: { a: { pos: -1, spot: 0 }, b: { pos: -1, spot: 1 } }, flags: {} },
  { positions: { a: { pos: 8, spot: 0 }, b: { pos: 10, spot: 0 } }, flags: { b: { slipstream: true } } },
  { positions: { a: { pos: 20, spot: 0 }, b: { pos: 11, spot: 0 } }, flags: { b: { spun: true } } },
];

describe("rankHistory", () => {
  it("ranks every round, grid included", () => {
    expect(rankHistory(usa, rounds)).toEqual([
      { a: 1, b: 2 },
      { b: 1, a: 2 },
      { a: 1, b: 2 },
    ]);
  });
});

describe("driverInsights", () => {
  it("counts passes, flags, moves and rounds led", () => {
    const [a, b] = driverInsights(usa, rounds);
    expect(a).toEqual({ id: "a", overtakes: 1, slipstreams: 0, spins: 0, averageMove: 10.5, bestMove: 12, roundsLed: 1 });
    expect(b).toEqual({ id: "b", overtakes: 1, slipstreams: 1, spins: 1, averageMove: 6, bestMove: 11, roundsLed: 1 });
  });
});
