import { describe, expect, it } from "vitest";
import type { Unlock } from "./achievements";
import type { StatsRace, StatsResult } from "./stats";
import { seasonWrapped } from "./wrapped";

const red = { id: "red", name: "Rojo", hex: "#d10500" };
const blue = { id: "blue", name: "Azul", hex: "#2563eb" };

const r = (userId: string, position: number, startPosition: number | null = null, extra: Partial<StatsResult> = {}): StatsResult => ({
  userId,
  position,
  spins: 0,
  startPosition,
  points: [9, 6, 4, 3][position - 1] ?? 0,
  carColor: null,
  upgrades: [],
  ...extra,
});

let day = 0;
const race = (results: StatsResult[], track = "italia", extra: Partial<StatsRace> = {}): StatsRace => {
  day++;
  return {
    id: `race${day}`,
    round: day,
    scheduledAt: new Date(Date.UTC(2026, 0, day)),
    season: { id: "s1", name: "2026" },
    track: { id: track, name: track },
    results,
    ...extra,
  };
};

const standings = [
  { userId: "leo", points: 21, rank: 1 },
  { userId: "ana", points: 16, rank: 2 },
  { userId: "eva", points: 8, rank: 3 },
];

describe("seasonWrapped", () => {
  const races = [
    race([r("leo", 1, 1), r("ana", 2, 3, { carColor: red, spins: 1 }), r("eva", 3, 2)], "italia"),
    race([r("ana", 1, 3, { carColor: red }), r("leo", 2, 1), r("eva", 3, 2)], "usa", { driverOfTheDay: ["ana"] }),
    race([r("leo", 1, 2), r("eva", 2, 1), r("ana", 3, 3, { carColor: blue })], "italia", {
      highlights: { winner: "leo", wireToWire: false, lastGasp: false, slipstreams: { ana: 4 }, duels: [] },
      predictions: [{ userId: "ana", picks: ["leo", "eva", "ana"] }],
    }),
  ];

  it("is null for a season they didn't race", () => {
    expect(seasonWrapped("zoe", races, standings, [], "s1")).toBeNull();
  });

  it("sums up the season", () => {
    const w = seasonWrapped("ana", races, standings, [], "s1")!;
    expect(w).toMatchObject({ races: 3, wins: 1, podiums: 3, points: 16, rank: 2, drivers: 3, spins: 1, driverOfTheDay: 1, slipstreams: 4 });
    expect(w.best).toMatchObject({ position: 1, race: { trackName: "usa" } });
    expect(w.comeback).toMatchObject({ gained: 2, position: 1 });
    expect(w.favouriteColor).toEqual({ name: "Rojo", hex: "#d10500", races: 2 });
    // usa (one win) loses to italia, raced twice
    expect(w.favouriteTrack).toEqual({ name: "italia", average: 2.5, races: 2 });
    expect(w.predictions).toEqual({ made: 1, points: 9 });
  });

  it("finds the nemesis and the victim", () => {
    const w = seasonWrapped("ana", races, standings, [], "s1")!;
    expect(w.nemesis).toEqual({ userId: "leo", times: 2, meetings: 3 });
    expect(w.victim).toEqual({ userId: "eva", times: 2, meetings: 3 });
  });

  it("counts the badges earned in this season only", () => {
    const at = (raceId: string): Unlock => ({ achievementId: "spin", userId: "ana", date: new Date(), race: { id: raceId, round: 1, seasonName: "", trackName: "" } });
    const unlocks: Unlock[] = [at(races[0].id), at("elsewhere"), { achievementId: "champion", userId: "ana", date: new Date(), season: { id: "s1", name: "2026" } }];
    expect(seasonWrapped("ana", races, standings, unlocks, "s1")!.badges).toEqual([
      { id: "spin", count: 1 },
      { id: "champion", count: 1 },
    ]);
  });
});
