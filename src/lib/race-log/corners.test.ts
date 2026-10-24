import { describe, expect, it } from "vitest";
import { cornerAhead, cornerStats } from "./corners";
import { franceLayout as france } from "./france";
import { cornerOf, spacesToCorner } from "./layout";
import type { LoggedRound } from "./rounds";
import { usaLayout as usa } from "./usa";

// USA corner lines sit before spaces 12, 33, 49 and 57

describe("cornerOf / cornerAhead", () => {
  it("maps lap spaces to the stretch they belong to and the corner ahead", () => {
    expect(cornerOf(usa, 12)).toBe(0);
    expect(cornerOf(usa, 32)).toBe(0);
    expect(cornerOf(usa, 60)).toBe(3);
    expect(cornerOf(usa, 5)).toBe(3); // finish straight
    expect(cornerAhead(usa, 32)).toBe(1);
    expect(cornerAhead(usa, 60)).toBe(0);
  });
});

describe("spacesToCorner", () => {
  it("matches the numbers printed beside the spaces on the France board", () => {
    expect(spacesToCorner(france, 0)).toBe(11);
    expect(spacesToCorner(france, 59)).toBe(12); // pole
    expect(spacesToCorner(france, 11)).toBe(0);
    expect(spacesToCorner(france, 12)).toBe(7);
    expect(spacesToCorner(france, 47)).toBe(24);
  });
});

describe("cornerStats", () => {
  it("counts passes and slipstreams where the car ended, spins at the corner ahead", () => {
    const rounds: LoggedRound[] = [
      { positions: { a: { pos: -1, spot: 0 }, b: { pos: -1, spot: 1 } }, flags: {} },
      // b passes a after corner 1 with a slipstream
      { positions: { a: { pos: 10, spot: 0 }, b: { pos: 14, spot: 0 } }, flags: { b: { slipstream: true } } },
      // a spins before corner 2, b stays ahead
      { positions: { a: { pos: 32, spot: 0 }, b: { pos: 40, spot: 0 } }, flags: { a: { spun: true } } },
    ];
    expect(cornerStats(usa, rounds)).toEqual([
      { passes: 1, spins: 0, slipstreams: 1 },
      { passes: 0, spins: 1, slipstreams: 0 },
      { passes: 0, spins: 0, slipstreams: 0 },
      { passes: 0, spins: 0, slipstreams: 0 },
    ]);
  });
});
