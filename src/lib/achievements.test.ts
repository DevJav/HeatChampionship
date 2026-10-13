import { describe, expect, it } from "vitest";
import { awardsFor, computeUnlocks, seasonPodiums, type AchievementId } from "./achievements";
import type { StatsRace, StatsResult } from "./stats";

const r = (userId: string, position: number | null, startPosition: number | null = null): StatsResult => ({
  userId,
  position,
  startPosition,
  points: position === 1 ? 9 : position === 2 ? 6 : position === 3 ? 4 : 0,
  carColor: null,
  upgrades: [],
});

let day = 0;
const race = (results: StatsResult[], { track = "italia", season = "s1" } = {}): StatsRace => {
  day += 1;
  return {
    id: `race${day}`,
    round: day,
    scheduledAt: new Date(Date.UTC(2026, 0, day)),
    season: { id: season, name: `Temporada ${season}` },
    track: { id: track, name: track },
    results,
  };
};

const ids = (userId: string, races: StatsRace[], seasons = [{ id: "s1", name: "Temporada s1", finished: false }]) =>
  computeUnlocks(races, seasons)
    .filter((u) => u.userId === userId)
    .map((u) => u.achievementId);

describe("computeUnlocks — firsts and milestones", () => {
  it("unlocks debut, first podium and first win once, in order", () => {
    const races = [race([r("ana", 3), r("leo", 1)]), race([r("ana", 1), r("leo", 2)]), race([r("ana", 1), r("leo", 2)])];
    expect(ids("ana", races)).toEqual(["first-race", "first-podium", "first-win"]);
  });

  it("counts veteran at the tenth start", () => {
    const races = Array.from({ length: 10 }, () => race([r("ana", 4), r("leo", 5)]));
    expect(ids("ana", races)).toEqual(["first-race", "veteran"]);
  });

  it("marks the first retirement as a spin", () => {
    expect(ids("ana", [race([r("ana", null), r("leo", 1)]), race([r("ana", null), r("leo", 1)])])).toEqual([
      "first-race",
      "spin",
    ]);
  });
});

describe("computeUnlocks — race feats", () => {
  it("wins from last on the grid only with three or more on it", () => {
    const winsFromBack = race([r("ana", 1, 4), r("leo", 2, 1), r("eva", 3, 2), r("max", 4, 3)]);
    const tinyGrid = race([r("ana", 1, 2), r("leo", 2, 1)]);
    expect(ids("ana", [winsFromBack])).toContain("from-the-back");
    expect(ids("ana", [tinyGrid])).not.toContain("from-the-back");
  });

  it("rewards comebacks of four places and pole-to-win", () => {
    expect(ids("leo", [race([r("ana", 1, 1), r("leo", 2, 6)])])).toContain("comeback");
    expect(ids("ana", [race([r("ana", 1, 1), r("leo", 2, 6)])])).toContain("pole-to-win");
    expect(ids("leo", [race([r("ana", 1), r("leo", 2, 5)])])).not.toContain("comeback");
  });

  it("awards a hat-trick on the third win in a row, again after the streak resets", () => {
    const win = () => race([r("ana", 1), r("leo", 2)]);
    const lose = () => race([r("ana", 2), r("leo", 1)]);
    const unlocked = ids("ana", [win(), win(), win(), win(), lose(), win(), win(), win()]);
    expect(unlocked.filter((id) => id === "hat-trick")).toHaveLength(2);
  });

  it("counts winning tracks for the globetrotter", () => {
    const races = ["italia", "francia", "italia", "usa"].map((track) => race([r("ana", 1)], { track }));
    const unlocked = computeUnlocks(races, []).filter((u) => u.achievementId === "globetrotter");
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0].race?.trackName).toBe("usa");
  });
});

describe("computeUnlocks — seasons", () => {
  const seasonRaces = () => [
    race([r("ana", 1), r("leo", 2), r("eva", 3), r("max", 4)]),
    race([r("ana", 2), r("leo", 1), r("eva", 3)]),
    race([r("ana", 1), r("leo", 3), r("eva", 2), r("max", 4)]),
  ];

  it("crowns the top three of finished seasons only", () => {
    const races = seasonRaces();
    const finished = [{ id: "s1", name: "Temporada s1", finished: true }];
    const trophies = (seasons: typeof finished) =>
      computeUnlocks(races, seasons)
        .filter((u) => ["champion", "runner-up", "third"].includes(u.achievementId))
        .map((u) => [u.achievementId, u.userId]);
    expect(trophies(finished)).toEqual([
      ["champion", "ana"],
      ["runner-up", "leo"],
      ["third", "eva"],
    ]);
    expect(trophies([{ ...finished[0], finished: false }])).toEqual([]);
  });

  it("gives Incansable to whoever raced every race of the season", () => {
    const unlocks = computeUnlocks(seasonRaces(), [{ id: "s1", name: "Temporada s1", finished: true }]);
    const ironmen = unlocks.filter((u) => u.achievementId === "ironman").map((u) => u.userId);
    expect(ironmen.sort()).toEqual(["ana", "eva", "leo"]);
  });

  it("lists season podiums newest first", () => {
    const older = [race([r("leo", 1), r("ana", 2)], { season: "s0" }), race([r("leo", 1), r("ana", 2)], { season: "s0" })];
    const unlocks = computeUnlocks([...older, ...seasonRaces()], [
      { id: "s0", name: "Temporada s0", finished: true },
      { id: "s1", name: "Temporada s1", finished: true },
    ]);
    expect(seasonPodiums(unlocks).map((p) => [p.season.id, p.places[1]])).toEqual([
      ["s1", ["ana"]],
      ["s0", ["leo"]],
    ]);
  });
});

describe("awardsFor", () => {
  it("returns the whole catalog with this driver's unlocks", () => {
    const awards = awardsFor("ana", computeUnlocks([race([r("ana", 1)])], []));
    const earned = awards.filter((a) => a.unlocks.length).map((a) => a.achievement.id);
    expect(earned.sort()).toEqual((["first-race", "first-podium", "first-win"] as AchievementId[]).sort());
    expect(awards.length).toBeGreaterThan(earned.length);
  });
});
