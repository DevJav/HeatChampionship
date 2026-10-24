import { describe, expect, it } from "vitest";
import { carLabels, logCsv, logExport, isRaceOver, newRaceLog, raceLogSchema, resultsFromLog, type RaceLogData } from "./log";
import { simulateRound } from "./simulate";
import { trackDrawing } from "./tracks";
import { usaLayout as usa } from "./usa";

const cars = [
  { userId: "a", colorId: "red", color: "#d10500" },
  { userId: "b", colorId: "blue", color: "#1d4ed8" },
  { userId: "c", colorId: null, color: "#15803d" },
];
const names = { a: "Ana", b: "Bea", c: "Carlos" };

/** Deterministic random numbers so the simulated race is always the same */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function finishedRace(): RaceLogData {
  const log = newRaceLog("usa", usa.laps, cars);
  const rand = seeded(7);
  while (!isRaceOver(usa, log)) log.rounds.push(simulateRound(usa, log.rounds[log.rounds.length - 1].positions, rand));
  log.draft = { positions: log.rounds[log.rounds.length - 1].positions, placed: [], flags: {} };
  return log;
}

describe("raceLogSchema", () => {
  it("accepts a new log and a finished one", () => {
    expect(raceLogSchema.safeParse(newRaceLog("usa", 2, cars)).success).toBe(true);
    expect(raceLogSchema.safeParse(finishedRace()).success).toBe(true);
  });

  it("rejects rounds that don't cover exactly the logged cars", () => {
    const log = newRaceLog("usa", 2, cars);
    const missing = { a: log.rounds[0].positions.a, b: log.rounds[0].positions.b };
    expect(raceLogSchema.safeParse({ ...log, rounds: [{ positions: missing, flags: {} }] }).success).toBe(false);
    expect(raceLogSchema.safeParse({ ...log, cars: [...cars, cars[0]] }).success).toBe(false);
  });
});

describe("resultsFromLog", () => {
  it("gives every driver a distinct finishing position, the grid slot, spins and colour", () => {
    const log = finishedRace();
    log.rounds[1].flags.b = { spun: true };
    log.rounds[2].flags.b = { spun: true, slipstream: true };
    const rows = resultsFromLog(usa, log);
    expect(rows.map((r) => r.position).sort()).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.startPosition)).toEqual([1, 2, 3]);
    expect(rows.find((r) => r.userId === "b")?.spins).toBeGreaterThanOrEqual(2);
    expect(rows.find((r) => r.userId === "c")?.carColorId).toBeNull();
  });
});

describe("exports", () => {
  it("writes one CSV row per driver and round, plus the header", () => {
    const log = finishedRace();
    const lines = logCsv(usa, log, names).trim().split("\n");
    expect(lines[0]).toBe("round,driver,rank,lap,space,total_spaces,moved,slipstream,spun,finished");
    expect(lines).toHaveLength(1 + log.rounds.length * cars.length);
    expect(lines[1]).toMatch(/^0,Ana,1,1,-1,-1,0,false,false,false$/);
  });

  it("describes the race with names, ranks and the classification", () => {
    const doc = logExport(usa, finishedRace(), names, { title: "Ronda 1 · USA", date: "2026-10-15", url: "https://x" });
    expect(doc.race.finished).toBe(true);
    expect(doc.drivers.map((d) => d.name)).toEqual(["Ana", "Bea", "Carlos"]);
    expect(doc.rounds[0].cars.map((c) => c.rank)).toEqual([1, 2, 3]);
    expect(doc.classification).toHaveLength(3);
  });
});

describe("carLabels", () => {
  it("uses initials and two letters when they clash", () => {
    expect(carLabels({ a: "Ana", b: "Alberto", c: "Carlos" })).toEqual({ a: "An", b: "Al", c: "C" });
  });
});

describe("trackDrawing", () => {
  it("applies the race's laps and knows only traced tracks", () => {
    expect(trackDrawing("usa", 3)?.layout.laps).toBe(3);
    expect(trackDrawing("usa")?.layout.laps).toBe(usa.laps);
    expect(trackDrawing("francia")?.layout.spacesPerLap).toBe(60);
    expect(trackDrawing("france")?.layout.spacesPerLap).toBe(60);
    expect(trackDrawing("italia")).toBeNull();
  });

  it("has one divider, space and badge per space and corner", () => {
    for (const slug of ["usa", "francia"]) {
      const { layout, geometry } = trackDrawing(slug)!;
      expect(geometry.dividers).toHaveLength(layout.spacesPerLap);
      expect(geometry.spaces).toHaveLength(layout.spacesPerLap);
      expect(geometry.badges).toHaveLength(layout.corners.length);
    }
  });
});
