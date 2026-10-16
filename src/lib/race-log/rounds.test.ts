import { describe, expect, it } from "vitest";
import { cornerBehind, racingLineSide } from "./layout";
import {
  classification,
  gridPositions,
  moves,
  placeCar,
  resolveTap,
  swapSpots,
  turnOrder,
  type LoggedRound,
} from "./rounds";
import { usaLayout as usa } from "./usa";

describe("gridPositions", () => {
  it("puts two cars per space behind the line, pole on the racing line", () => {
    expect(gridPositions(["a", "b", "c"])).toEqual({
      a: { pos: -1, spot: 0 },
      b: { pos: -1, spot: 1 },
      c: { pos: -2, spot: 0 },
    });
  });
});

describe("turnOrder", () => {
  it("goes leader first, racing line breaking ties, finished cars out", () => {
    const order = turnOrder(usa, {
      a: { pos: 10, spot: 1 },
      b: { pos: 10, spot: 0 },
      c: { pos: 14, spot: 0 },
      d: { pos: 138, spot: 0 },
    });
    expect(order).toEqual(["c", "b", "a"]);
  });
});

describe("placeCar", () => {
  it("puts the first car into a space on the racing line", () => {
    const next = placeCar({ a: { pos: 0, spot: 0 } }, "a", 7);
    expect(next?.a).toEqual({ pos: 7, spot: 0 });
  });

  it("puts a later arrival beside the car already there", () => {
    const next = placeCar({ a: { pos: 7, spot: 0 }, b: { pos: 2, spot: 0 } }, "b", 7);
    expect(next).toEqual({ a: { pos: 7, spot: 0 }, b: { pos: 7, spot: 1 } });
  });

  it("refuses a full space", () => {
    const full = { a: { pos: 7, spot: 0 }, b: { pos: 7, spot: 1 }, c: { pos: 3, spot: 0 } };
    expect(placeCar(full, "c", 7)).toBeNull();
  });

  it("slides the car left behind onto the racing line", () => {
    const next = placeCar({ a: { pos: 5, spot: 0 }, b: { pos: 5, spot: 1 } }, "a", 9);
    expect(next?.b).toEqual({ pos: 5, spot: 0 });
  });

  it("keeps a car that was already there ahead of a spun car landing beside it", () => {
    const next = placeCar({ a: { pos: 20, spot: 1 }, b: { pos: 11, spot: 0 } }, "a", 11);
    expect(next).toEqual({ a: { pos: 11, spot: 1 }, b: { pos: 11, spot: 0 } });
  });
});

describe("swapSpots", () => {
  it("swaps the two cars in a space", () => {
    const swapped = swapSpots({ a: { pos: 4, spot: 0 }, b: { pos: 4, spot: 1 } }, 4);
    expect(swapped).toEqual({ a: { pos: 4, spot: 1 }, b: { pos: 4, spot: 0 } });
  });
});

describe("resolveTap", () => {
  it("reads a tap as the next time the car reaches that space", () => {
    expect(resolveTap(usa, -1, 8)).toBe(8);
    expect(resolveTap(usa, 60, 5)).toBe(74);
  });

  it("reads a tap a few spaces back as a spin-out", () => {
    expect(resolveTap(usa, 14, 11)).toBe(11);
  });
});

describe("classification", () => {
  it("ranks by the round the line was crossed, then distance past it", () => {
    const round = (positions: LoggedRound["positions"]): LoggedRound => ({ positions, flags: {} });
    const rounds = [
      round({ a: { pos: 130, spot: 0 }, b: { pos: 132, spot: 0 }, c: { pos: 120, spot: 0 } }),
      round({ a: { pos: 139, spot: 0 }, b: { pos: 136, spot: 0 }, c: { pos: 128, spot: 0 } }),
      round({ a: { pos: 139, spot: 0 }, b: { pos: 145, spot: 0 }, c: { pos: 140, spot: 0 } }),
    ];
    expect(classification(usa, rounds)).toEqual(["a", "b", "c"]);
  });
});

describe("moves", () => {
  it("counts spaces moved, negative after a spin-out", () => {
    expect(moves({ a: { pos: 3, spot: 0 }, b: { pos: 30, spot: 0 } }, { a: { pos: 12, spot: 0 }, b: { pos: 28, spot: 0 } })).toEqual({
      a: 9,
      b: -2,
    });
  });
});

describe("USA layout", () => {
  it("adds up to the track card", () => {
    const starts = usa.corners.map((c) => c.before);
    const lengths = starts.map((s, i) => ((starts[(i + 1) % starts.length] - s + 69) % 69));
    expect(lengths).toEqual([21, 16, 8, 24]);
    expect(usa.corners.map((c) => c.limit)).toEqual([7, 3, 3, 2]);
  });

  it("finds the corner behind each space, wrapping past the line", () => {
    expect(cornerBehind(usa, 0).limit).toBe(2);
    expect(cornerBehind(usa, 12).limit).toBe(7);
    expect(racingLineSide(usa, 68)).toBe("left");
    expect(racingLineSide(usa, 40)).toBe("right");
  });
});
