import { describe, expect, it } from "vitest";
import { computeStandings, pointsProgression, type StandingsRace } from "./standings";

const TABLE = [9, 6, 4, 3, 2, 1];
const race = (round: number, order: string[]): StandingsRace => ({
  id: `r${round}`,
  round,
  results: order.map((userId, i) => ({ userId, position: i + 1, points: TABLE[i] ?? 0 })),
});

describe("computeStandings", () => {
  it("sums points and counts wins, podiums and starts", () => {
    const rows = computeStandings([race(1, ["ana", "marco", "lucia"]), race(2, ["marco", "ana"])]);
    const ana = rows.find((r) => r.userId === "ana")!;
    const lucia = rows.find((r) => r.userId === "lucia")!;
    expect(ana).toMatchObject({ points: 15, wins: 1, podiums: 2, starts: 2 });
    expect(lucia).toMatchObject({ points: 4, podiums: 1, starts: 1 });
    expect(lucia.positions).toEqual({ r1: 3 });
  });

  it("orders by points and reports the gap to the leader", () => {
    // marco (2nd + 3rd) and lucia (3rd + 2nd) are fully tied: shared rank, listed alphabetically
    const rows = computeStandings([race(1, ["ana", "marco", "lucia"]), race(2, ["ana", "lucia", "marco"])]);
    expect(rows.map((r) => [r.userId, r.rank, r.points, r.gap])).toEqual([
      ["ana", 1, 18, 0],
      ["lucia", 2, 10, 8],
      ["marco", 2, 10, 8],
    ]);
  });

  it("breaks points ties by countback (more wins first)", () => {
    // marco: 1st + 6th = 10 ; lucia: 2nd + 3rd = 10 → marco ahead on wins
    const rows = computeStandings([
      race(1, ["marco", "lucia", "x", "y", "z", "w"]),
      race(2, ["a", "b", "lucia", "c", "d", "marco"]),
    ]);
    const order = rows.map((r) => r.userId);
    expect(order.indexOf("marco")).toBeLessThan(order.indexOf("lucia"));
    expect(rows.find((r) => r.userId === "lucia")!.rank).toBeGreaterThan(rows.find((r) => r.userId === "marco")!.rank);
  });

  it("shares the rank when drivers are fully tied", () => {
    const rows = computeStandings([race(1, ["ana", "marco"]), race(2, ["marco", "ana"])]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1]);
  });

  it("tracks movement since before the latest race", () => {
    const rows = computeStandings([race(1, ["ana", "marco", "lucia"]), race(2, ["lucia", "marco", "ana"])]);
    // After r1: ana 1st, marco 2nd, lucia 3rd.
    // After r2: ana 13, lucia 13 (same countback → shared 1st), marco 12 (3rd).
    const lucia = rows.find((r) => r.userId === "lucia")!;
    expect(lucia.movement).toBe(2);
    expect(rows.find((r) => r.userId === "marco")!.movement).toBe(-1);
  });

  it("has no movement after the first race or for newcomers", () => {
    expect(computeStandings([race(1, ["ana"])])[0].movement).toBeNull();
    const rows = computeStandings([race(1, ["ana"]), race(2, ["new", "ana"])]);
    expect(rows.find((r) => r.userId === "new")!.movement).toBeNull();
  });

  it("is empty with no races", () => {
    expect(computeStandings([])).toEqual([]);
  });
});

describe("pointsProgression", () => {
  it("accumulates points round by round", () => {
    const progression = pointsProgression([race(2, ["marco", "ana"]), race(1, ["ana", "marco"])], ["ana", "marco"]);
    expect(progression.map((p) => [p.round, p.totals])).toEqual([
      [1, { ana: 9, marco: 6 }],
      [2, { ana: 15, marco: 15 }],
    ]);
  });
});
