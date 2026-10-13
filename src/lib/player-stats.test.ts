import { describe, expect, it } from "vitest";
import { summarizePlayer, type PlayerResult } from "./player-stats";

let day = 0;
const result = (position: number | null, extra: Partial<PlayerResult> = {}): PlayerResult => ({
  raceId: `r${++day}`,
  scheduledAt: new Date(Date.UTC(2026, 0, day)),
  trackId: "italia",
  trackName: "Italia",
  position,
  startPosition: null,
  points: 0,
  ...extra,
});

describe("summarizePlayer", () => {
  it("counts starts, wins, podiums and retirements", () => {
    const s = summarizePlayer([result(1, { points: 9 }), result(3, { points: 4 }), result(null), result(5, { points: 2 })]);
    expect(s).toMatchObject({ starts: 4, wins: 1, podiums: 2, dnfs: 1, points: 15, bestFinish: 1 });
  });

  it("averages finishing position without retirements", () => {
    expect(summarizePlayer([result(1), result(4), result(null)]).averageFinish).toBe(2.5);
  });

  it("averages places gained only where the grid was recorded", () => {
    const s = summarizePlayer([result(1, { startPosition: 4 }), result(3, { startPosition: 2 }), result(2)]);
    expect(s.averageGained).toBe(1); // (+3 − 1) / 2
  });

  it("lists recent form, newest first", () => {
    const s = summarizePlayer([result(4), result(2), result(null), result(1)], 3);
    expect(s.form).toEqual([1, null, 2]);
  });

  it("picks the track with the best average finish", () => {
    const s = summarizePlayer([
      result(4, { trackId: "usa", trackName: "EE. UU." }),
      result(1, { trackId: "francia", trackName: "Francia" }),
      result(3, { trackId: "francia", trackName: "Francia" }),
    ]);
    expect(s.bestTrack).toEqual({ trackId: "francia", trackName: "Francia", averageFinish: 2, starts: 2 });
  });

  it("handles a player with no results", () => {
    expect(summarizePlayer([])).toMatchObject({
      starts: 0,
      averageFinish: null,
      bestFinish: null,
      averageGained: null,
      form: [],
      bestTrack: null,
    });
  });
});
