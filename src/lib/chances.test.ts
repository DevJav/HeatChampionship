import { describe, expect, it } from "vitest";
import { driverRating, raceChances } from "./chances";
import type { StatsRace, StatsResult } from "./stats";

const r = (userId: string, position: number): StatsResult => ({
  userId,
  position,
  spins: 0,
  startPosition: null,
  points: 0,
  carColor: null,
  upgrades: [],
});

let day = 0;
const race = (order: string[], track = "italia"): StatsRace => {
  day++;
  return {
    id: `race${day}`,
    round: day,
    scheduledAt: new Date(Date.UTC(2026, 0, day)),
    season: { id: "s1", name: "s1" },
    track: { id: track, name: track },
    results: order.map((id, i) => r(id, i + 1)),
  };
};

describe("driverRating", () => {
  it("starts newcomers at average and rewards good finishes", () => {
    const races = [race(["ana", "leo", "eva"]), race(["ana", "eva", "leo"])];
    expect(driverRating("zoe", races, "italia")).toBe(0.5);
    expect(driverRating("ana", races, "italia")).toBeGreaterThan(0.75);
    expect(driverRating("leo", races, "italia")).toBeLessThan(0.5);
  });

  it("weighs recent races and the same track more", () => {
    const oldWin = [race(["ana", "leo"]), race(["leo", "ana"])];
    expect(driverRating("leo", oldWin, "italia")).toBeGreaterThan(driverRating("ana", oldWin, "italia"));
    const trackWin = [race(["ana", "leo"], "usa"), race(["leo", "ana"], "francia")];
    expect(driverRating("ana", trackWin, "usa")).toBeGreaterThan(driverRating("leo", trackWin, "usa"));
  });
});

describe("raceChances", () => {
  const history = Array.from({ length: 6 }, () => race(["ana", "leo", "eva", "max"]));

  it("makes the in-form driver favourite, with probabilities that add up", () => {
    const chances = raceChances(["max", "eva", "leo", "ana"], history, "italia");
    expect(chances[0].userId).toBe("ana");
    expect(chances[0].win).toBeGreaterThan(chances[3].win);
    expect(chances.reduce((sum, o) => sum + o.win, 0)).toBeCloseTo(1, 5);
    expect(chances.reduce((sum, o) => sum + o.podium, 0)).toBeCloseTo(3, 5);
  });

  it("is stable for the same race", () => {
    expect(raceChances(["ana", "leo", "eva"], history, "italia")).toEqual(raceChances(["ana", "leo", "eva"], history, "italia"));
  });
});
