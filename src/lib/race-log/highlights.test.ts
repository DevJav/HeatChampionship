import { describe, expect, it } from "vitest";
import { momentOfTheRace, pairDuels, raceHighlights, rivalryOfTheRace } from "./highlights";
import type { LoggedRound, Positions } from "./rounds";
import { usaLayout as usa } from "./usa";

const END = usa.spacesPerLap * usa.laps;

/** A round from car → space, everyone on the racing line unless they share a space. */
function round(spaces: Record<string, number>, flags: LoggedRound["flags"] = {}): LoggedRound {
  const positions: Positions = {};
  const taken = new Map<number, number>();
  for (const [id, pos] of Object.entries(spaces)) {
    const spot = taken.get(pos) ?? 0;
    taken.set(pos, spot + 1);
    positions[id] = { pos, spot };
  }
  return { positions, flags };
}

const grid = round({ a: -1, b: -1, c: -2 });

describe("raceHighlights", () => {
  it("is empty until every car has finished", () => {
    const h = raceHighlights(usa, [grid, round({ a: 10, b: 8, c: 5 }, { b: { slipstream: true } })]);
    expect(h).toMatchObject({ winner: null, wireToWire: false, lastGasp: false, slipstreams: { b: 1 } });
  });

  it("spots a wire-to-wire win", () => {
    const h = raceHighlights(usa, [grid, round({ a: 70, b: 60, c: 50 }), round({ a: END, b: END - 5, c: END - 9 }), round({ a: END + 9, b: END + 2, c: END })]);
    expect(h.winner).toBe("a");
    expect(h.wireToWire).toBe(true);
    expect(h.lastGasp).toBe(false);
  });

  it("spots a win snatched in the final round", () => {
    const h = raceHighlights(usa, [grid, round({ a: 70, b: 60, c: 50 }), round({ a: END - 1, b: END + 3, c: END }), round({ a: END + 6, b: END + 3, c: END })]);
    expect(h.winner).toBe("b");
    expect(h.wireToWire).toBe(false);
    expect(h.lastGasp).toBe(true);
  });
});

describe("momentOfTheRace", () => {
  it("picks the biggest climb, preferring the later round on a tie", () => {
    const rounds = [grid, round({ a: 10, b: 8, c: 12 }), round({ a: 20, b: 18, c: 15 }), round({ a: 25, b: 30, c: 31 })];
    // c: 3rd → 1st in round 1, then 1st → 3rd, then 3rd → 1st again in round 3
    expect(momentOfTheRace(usa, rounds)).toEqual({ userId: "c", round: 3, from: 3, to: 1 });
  });

  it("ignores single-place swaps", () => {
    expect(momentOfTheRace(usa, [grid, round({ a: 8, b: 10, c: 2 })])).toBeNull();
  });
});

describe("pairDuels", () => {
  const rounds = [
    grid,
    round({ a: 10, b: 11, c: 2 }), // b passes a, close
    round({ a: 20, b: 19, c: 9 }), // a passes b, close
    round({ a: 28, b: 30, c: 15 }), // b passes a
    round({ a: 40, b: 41, c: 39 }), // c closes up on a
  ];

  it("counts swaps and close rounds per pair", () => {
    const duels = pairDuels(usa, rounds);
    expect(duels.find((d) => d.a === "a" && d.b === "b")).toEqual({ a: "a", b: "b", swaps: 3, close: 3 });
    expect(duels.find((d) => d.a === "a" && d.b === "c")).toEqual({ a: "a", b: "c", swaps: 0, close: 1 });
  });

  it("names the rivalry of the race only with enough swaps", () => {
    expect(rivalryOfTheRace(pairDuels(usa, rounds))).toMatchObject({ a: "a", b: "b", swaps: 3 });
    expect(rivalryOfTheRace(pairDuels(usa, rounds.slice(0, 2)))).toBeNull();
  });
});
