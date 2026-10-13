import { describe, expect, it } from "vitest";
import {
  carColorStats,
  championshipRecords,
  driverCodes,
  driverStats,
  duelStep,
  gridStats,
  headToHead,
  qualifyingStarts,
  trackStats,
  upgradeStats,
  type StatsRace,
  type StatsResult,
} from "./stats";

const red = { id: "red", name: "Rojo", hex: "#d10500" };
const blue = { id: "blue", name: "Azul", hex: "#2a78d6" };
const sprint = { id: "sprint", name: "Sprint" };

const r = (userId: string, position: number | null, extra: Partial<StatsResult> = {}): StatsResult => ({
  userId,
  position,
  startPosition: null,
  points: position === 1 ? 9 : position === 2 ? 6 : position === 3 ? 4 : 0,
  carColor: null,
  upgrades: [],
  ...extra,
});

let day = 0;
const race = (results: StatsResult[], track = "italia"): StatsRace => {
  day += 1;
  return {
    id: `race${day}`,
    round: day,
    scheduledAt: new Date(Date.UTC(2026, 0, day)),
    season: { id: "s1", name: "Temporada 1" },
    track: { id: track, name: track === "italia" ? "Italia" : "Francia" },
    results,
  };
};

describe("driverStats", () => {
  it("ranks by points per race and computes rates", () => {
    const races = [race([r("ana", 1), r("leo", 2)]), race([r("ana", 2), r("leo", 1), r("eva", 3)])];
    const stats = driverStats(races);
    expect(stats.map((d) => d.userId)).toEqual(["ana", "leo", "eva"]);
    expect(stats[0]).toMatchObject({ starts: 2, wins: 1, podiums: 2, points: 15, pointsPerRace: 7.5, winRate: 0.5 });
  });
});

describe("championshipRecords", () => {
  it("lists every driver tied for a record", () => {
    const races = [race([r("ana", 1), r("leo", 2)]), race([r("leo", 1), r("ana", 2)])];
    const records = championshipRecords(races);
    expect(records.mostWins?.value).toBe(1);
    expect(records.mostWins?.holders.map((h) => h.userId).sort()).toEqual(["ana", "leo"]);
  });

  it("counts streaks over consecutive starts and flags running ones", () => {
    const races = [
      race([r("ana", 1), r("leo", 2)]),
      race([r("ana", 1), r("leo", 2)]),
      race([r("leo", 1)]), // ana absent: her streak continues
      race([r("ana", 1), r("leo", 2)]),
      race([r("leo", 1), r("ana", 2)]),
    ];
    const { winStreak, podiumStreak } = championshipRecords(races);
    expect(winStreak).toEqual({ value: 3, holders: [{ userId: "ana", ongoing: false }] });
    expect(podiumStreak?.value).toBe(5);
    expect(podiumStreak?.holders).toEqual([{ userId: "leo", ongoing: true }]);
  });

  it("finds the biggest comeback and the win from furthest back", () => {
    const races = [
      race([r("ana", 1, { startPosition: 2 }), r("leo", 2, { startPosition: 6 }), r("eva", 3, { startPosition: 1 })]),
      race([r("eva", 1, { startPosition: 5 }), r("ana", null, { startPosition: 1 })]),
    ];
    const records = championshipRecords(races);
    expect(records.biggestComeback?.value).toBe(4);
    expect(records.biggestComeback?.holders).toEqual([
      expect.objectContaining({ userId: "leo", detail: "Salió 6º, llegó 2º", race: expect.objectContaining({ id: races[0].id }) }),
      expect.objectContaining({ userId: "eva" }),
    ]);
    expect(records.winFromFurthestBack).toMatchObject({ value: 5, holders: [{ userId: "eva" }] });
  });

  it("needs enough starts to rank on average finish", () => {
    const races = [
      race([r("ana", 2), r("leo", 3)]),
      race([r("ana", 2), r("leo", 3)]),
      race([r("eva", 1), r("ana", 2)]),
    ];
    const records = championshipRecords(races);
    expect(records.minStarts).toBe(2);
    expect(records.bestAverageFinish).toEqual({ value: 2, holders: [{ userId: "ana" }] });
  });

  it("returns null records when nothing qualifies", () => {
    const records = championshipRecords([race([r("ana", null)])]);
    expect(records.mostWins).toBeNull();
    expect(records.biggestComeback).toBeNull();
    expect(records.winStreak).toBeNull();
  });
});

describe("headToHead", () => {
  it("counts shared races and who finished ahead, retirements losing", () => {
    const duels = headToHead([
      race([r("ana", 1), r("leo", 2)]),
      race([r("leo", 1), r("ana", null)]),
      race([r("ana", null), r("leo", null)]),
      race([r("ana", 3), r("eva", 1)]),
    ]);
    expect(duels.get("ana")?.get("leo")).toEqual({ meetings: 3, ahead: 1, behind: 1 });
    expect(duels.get("leo")?.get("ana")).toEqual({ meetings: 3, ahead: 1, behind: 1 });
    expect(duels.get("eva")?.get("ana")).toEqual({ meetings: 1, ahead: 1, behind: 0 });
    expect(duels.get("eva")?.get("leo")).toBeUndefined();
  });
});

describe("duelStep", () => {
  it("bands the share of decided races symmetrically", () => {
    const step = (ahead: number, behind: number) => duelStep({ meetings: ahead + behind, ahead, behind });
    expect([step(5, 5), step(6, 5), step(6, 4), step(8, 2), step(9, 1), step(0, 4), step(4, 5)]).toEqual([0, 0, 1, 2, 3, -3, -1]);
    expect(duelStep({ meetings: 2, ahead: 0, behind: 0 })).toBe(0);
  });
});

describe("trackStats", () => {
  it("summarizes races, top winners and the last winner per track", () => {
    const stats = trackStats([
      race([r("ana", 1), r("leo", 2)]),
      race([r("leo", 1), r("ana", 2), r("eva", 3)]),
      race([r("ana", 1)], "francia"),
      race([r("ana", 1), r("leo", 2), r("eva", 3)]),
    ]);
    expect(stats[0]).toMatchObject({
      trackName: "Italia",
      races: 3,
      averageField: 8 / 3,
      topWinners: { userIds: ["ana"], wins: 2 },
      lastWinnerId: "ana",
    });
    expect(stats[1]).toMatchObject({ trackName: "Francia", races: 1 });
  });
});

describe("carColorStats / upgradeStats", () => {
  it("tallies uses, wins and podiums, most used first", () => {
    const races = [
      race([r("ana", 1, { carColor: red, upgrades: [sprint] }), r("leo", 2, { carColor: blue })]),
      race([r("ana", 4, { carColor: red }), r("leo", null, { carColor: blue, upgrades: [sprint] })]),
      race([r("ana", 3, { carColor: red })]),
    ];
    expect(carColorStats(races)).toEqual([
      { color: red, uses: 3, wins: 1, podiums: 2, winRate: 1 / 3, averageFinish: 8 / 3 },
      { color: blue, uses: 2, wins: 0, podiums: 1, winRate: 0, averageFinish: 2 },
    ]);
    expect(upgradeStats(races)).toEqual([
      { upgrade: sprint, uses: 2, wins: 1, podiums: 1, winRate: 0.5, averageFinish: 1 },
    ]);
  });
});

describe("gridStats", () => {
  it("covers every slot up to the furthest one used", () => {
    const stats = gridStats([
      race([r("ana", 1, { startPosition: 3 }), r("leo", 2, { startPosition: 1 })]),
      race([r("leo", 1, { startPosition: 1 }), r("ana", 2)]),
    ]);
    expect(stats.map((s) => [s.startPosition, s.uses, s.wins])).toEqual([
      [1, 2, 1],
      [2, 0, 0],
      [3, 1, 1],
    ]);
  });
});

describe("qualifyingStarts", () => {
  it("asks for a third of the races, at least two", () => {
    expect(qualifyingStarts(1)).toBe(2);
    expect(qualifyingStarts(10)).toBe(4);
  });
});

describe("driverCodes", () => {
  it("makes unique three-letter codes without accents", () => {
    const codes = driverCodes([
      { id: "1", name: "Lucía" },
      { id: "2", name: "Lucas" },
      { id: "3", name: "Lucinda" },
      { id: "4", name: "Al" },
      { id: "5", name: "Lucia" },
    ]);
    expect([...codes.values()]).toEqual(["LUC", "LUS", "LUA", "ALX", "LU2"]);
  });
});
