import { describe, expect, it } from "vitest";
import { parsePointsTable, positionsGained, scoreRace } from "./scoring";

const TABLE = [9, 6, 4, 3, 2, 1];

describe("scoreRace", () => {
  it("awards points by finishing position", () => {
    const points = scoreRace(
      [
        { userId: "a", position: 1 },
        { userId: "b", position: 2 },
        { userId: "c", position: 6 },
      ],
      TABLE,
    );
    expect(Object.fromEntries(points)).toEqual({ a: 9, b: 6, c: 1 });
  });

  it("gives 0 beyond the end of the table", () => {
    const points = scoreRace([{ userId: "g", position: 7 }, { userId: "h", position: 8 }], TABLE);
    expect(Object.fromEntries(points)).toEqual({ g: 0, h: 0 });
  });

  it("gives 0 to retired players", () => {
    expect(scoreRace([{ userId: "x", position: null }], TABLE).get("x")).toBe(0);
  });

  it("works with custom tables", () => {
    const f1 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    expect(scoreRace([{ userId: "a", position: 8 }], f1).get("a")).toBe(4);
  });
});

describe("positionsGained", () => {
  it("is start minus finish", () => {
    expect(positionsGained(5, 2)).toBe(3);
    expect(positionsGained(1, 4)).toBe(-3);
    expect(positionsGained(3, 3)).toBe(0);
  });

  it("is null when either is unknown", () => {
    expect(positionsGained(null, 2)).toBeNull();
    expect(positionsGained(2, null)).toBeNull();
  });
});

describe("parsePointsTable", () => {
  it("keeps valid integers only", () => {
    expect(parsePointsTable([9, 6, "x", -1, 2.5, 4])).toEqual([9, 6, 4]);
    expect(parsePointsTable(null)).toEqual([]);
  });
});
