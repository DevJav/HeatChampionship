import { describe, expect, it } from "vitest";
import type { Shot } from "./director";
import { indexAt, insertShot, MIN_SHOT, moveCut, moveShot, removeShot, resize, setEnd, sourceLength, splitAt } from "./script-edit";

const shot = (start: number, end: number, kind: Shot["kind"] = "chase", extra: Partial<Shot> = {}): Shot => ({ start, end, kind, subject: "a", ...extra });
const script = () => [shot(-1, 0, "grid"), shot(0, 2), shot(2, 3, "heli"), shot(3, 5, "onboard")];

function backToBack(shots: Shot[]) {
  for (let i = 1; i < shots.length; i++) expect(shots[i].start).toBeCloseTo(shots[i - 1].end, 9);
  for (const s of shots) expect(s.end - s.start).toBeGreaterThanOrEqual(MIN_SHOT - 1e-9);
}

describe("splitAt", () => {
  it("cuts the shot under the playhead in two", () => {
    const next = splitAt(script(), 1)!;
    expect(next.map((s) => [s.start, s.end, s.kind])).toEqual([
      [-1, 0, "grid"],
      [0, 1, "chase"],
      [1, 2, "chase"],
      [2, 3, "heli"],
      [3, 5, "onboard"],
    ]);
  });

  it("refuses to leave a sliver", () => {
    expect(splitAt(script(), 0.05)).toBeNull();
    expect(splitAt(script(), 1.97)).toBeNull();
  });

  it("lets a cut replay carry on from where it was", () => {
    const replay = [shot(0, 2, "replay", { of: 10, rate: 0.5 }), shot(2, 3)];
    const [a, b] = splitAt(replay, 1)!;
    expect(a.of).toBe(10);
    expect(b.of).toBe(10.5);
    expect(sourceLength(a) + sourceLength(b)).toBe(sourceLength(replay[0]));
  });
});

describe("removeShot", () => {
  it("gives its time to the shot before", () => {
    const next = removeShot(script(), 2)!;
    expect(next.map((s) => [s.start, s.end])).toEqual([
      [-1, 0],
      [0, 3],
      [3, 5],
    ]);
  });

  it("gives the first shot's time to the next", () => {
    expect(removeShot(script(), 0)![0]).toMatchObject({ start: -1, end: 2, kind: "chase" });
  });

  it("keeps the last shot", () => {
    expect(removeShot([shot(0, 1)], 0)).toBeNull();
  });
});

describe("moving cuts and shots", () => {
  it("moves the cut between two shots, within limits", () => {
    expect(moveCut(script(), 2, 2.5).map((s) => [s.start, s.end]).slice(1, 3)).toEqual([
      [0, 2.5],
      [2.5, 3],
    ]);
    const squeezed = moveCut(script(), 2, 99);
    expect(squeezed[2].start).toBeCloseTo(3 - MIN_SHOT);
    backToBack(squeezed);
  });

  it("slides a shot keeping its length", () => {
    const next = moveShot(script(), 2, 2.5);
    expect([next[2].start, next[2].end]).toEqual([2.5, 3.5]);
    expect(next[1].end).toBe(2.5);
    expect(next[3].start).toBe(3.5);
    backToBack(moveShot(script(), 2, -50));
    backToBack(moveShot(script(), 2, 50));
  });

  it("doesn't move the first or the last shot", () => {
    expect(moveShot(script(), 0, 3)).toEqual(script());
    expect(moveShot(script(), 3, 1)).toEqual(script());
  });

  it("sets where a shot ends", () => {
    expect(setEnd(script(), 1, 1.5)[1].end).toBe(1.5);
  });
});

describe("insertShot", () => {
  it("lays a shot over the ones it covers", () => {
    const { shots, index } = insertShot(script(), { kind: "replay", subject: "b", of: 0.5 }, 1.5, 2);
    expect(shots[index]).toMatchObject({ start: 1.5, end: 3.5, kind: "replay" });
    expect(shots.map((s) => s.kind)).toEqual(["grid", "chase", "replay", "onboard"]);
    backToBack(shots);
    expect(shots[0].start).toBe(-1);
    expect(shots.at(-1)!.end).toBe(5);
  });

  it("doesn't leave slivers either side", () => {
    const { shots } = insertShot(script(), { kind: "replay", subject: "b" }, 2.05, 0.9);
    backToBack(shots);
    expect(shots.map((s) => s.kind)).toEqual(["grid", "chase", "replay", "onboard"]);
  });

  it("stops at the end of the replay", () => {
    const { shots, index } = insertShot(script(), { kind: "heli", subject: "b" }, 4.5, 3);
    expect(shots[index].end).toBe(5);
    backToBack(shots);
  });

  it("finds the shot at a time", () => {
    expect(indexAt(script(), 2.5)).toBe(2);
    expect(indexAt(script(), 99)).toBe(3);
  });
});

describe("resize", () => {
  it("hands the time to the next shot when it gets shorter", () => {
    const next = resize(script(), 1, 1);
    expect(next.map((s) => [s.start, s.end]).slice(1, 3)).toEqual([
      [0, 1],
      [1, 3],
    ]);
  });

  it("lays itself over the shots after it when it gets longer", () => {
    const next = resize(script(), 1, 3.5);
    expect(next.map((s) => [s.start, s.end, s.kind])).toEqual([
      [-1, 0, "grid"],
      [0, 3.5, "chase"],
      [3.5, 5, "onboard"],
    ]);
  });
});

describe("trimming a replay's start", () => {
  const replays = () => [shot(0, 1), shot(1, 3, "replay", { of: 10, rate: 0.5 }), shot(3, 4)];

  it("plays back from later when a cut moves into it, like trimming a clip", () => {
    const next = moveCut(replays(), 1, 2);
    expect(next[1]).toMatchObject({ start: 2, end: 3, of: 10.5 });
  });

  it("plays back from later when a new shot covers its start", () => {
    const { shots } = insertShot(replays(), { kind: "heli", subject: "a" }, 0.5, 1);
    expect(shots[2]).toMatchObject({ kind: "replay", start: 1.5, of: 10.25 });
  });
});
