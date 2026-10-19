import { describe, expect, it } from "vitest";
import { checkPicks, oracleTable, PredictionError, predictionsClosed, predictionsOpen, scorePicks, type Picks } from "./predictions";

const start = new Date("2026-11-14T17:00:00Z");
const race = { status: "OPEN", scheduledAt: start };
const before = new Date("2026-11-14T16:00:00Z");
const after = new Date("2026-11-14T18:00:00Z");

describe("prediction window", () => {
  it("is open until the start, then closed", () => {
    expect(predictionsOpen(race, before)).toBe(true);
    expect(predictionsOpen(race, after)).toBe(false);
    expect(predictionsClosed(race, before)).toBe(false);
    expect(predictionsClosed(race, after)).toBe(true);
    expect(predictionsOpen({ status: "DRAFT", scheduledAt: start }, before)).toBe(false);
  });
});

describe("checkPicks", () => {
  const entrants = ["ana", "leo", "eva", "max"];
  const check = (picks: string[], when = before) => () => checkPicks(race, entrants, picks, when);

  it("accepts three different entrants, yourself included", () => {
    expect(check(["ana", "leo", "eva"])).not.toThrow();
  });

  it("refuses repeats, outsiders, gaps and late picks", () => {
    expect(check(["ana", "ana", "eva"])).toThrow(PredictionError);
    expect(check(["ana", "leo", "zoe"])).toThrow(PredictionError);
    expect(check(["ana", "leo", ""])).toThrow(PredictionError);
    expect(check(["ana", "leo", "eva"], after)).toThrow(PredictionError);
  });
});

describe("scorePicks", () => {
  const podium = ["ana", "leo", "eva"];
  it("scores 3 per exact place and 1 per podium driver in another place", () => {
    expect(scorePicks(["ana", "leo", "eva"], podium)).toEqual({ points: 9, exact: 3, perfect: true });
    expect(scorePicks(["leo", "ana", "max"], podium)).toEqual({ points: 2, exact: 0, perfect: false });
    expect(scorePicks(["ana", "eva", "max"], podium)).toEqual({ points: 4, exact: 1, perfect: false });
  });
});

describe("oracleTable", () => {
  it("adds up a season and shares ranks on full ties", () => {
    const results = [
      { userId: "ana", position: 1 },
      { userId: "leo", position: 2 },
      { userId: "eva", position: 3 },
    ];
    const p = (userId: string, picks: Picks) => ({ userId, picks });
    const rows = oracleTable([
      { results, predictions: [p("zoe", ["ana", "leo", "eva"]), p("max", ["leo", "ana", "eva"]), p("kim", ["leo", "ana", "eva"])] },
    ]);
    expect(rows.map((r) => [r.userId, r.points, r.rank])).toEqual([
      ["zoe", 9, 1],
      ["max", 5, 2],
      ["kim", 5, 2],
    ]);
    expect(rows[0].perfect).toBe(1);
  });
});
