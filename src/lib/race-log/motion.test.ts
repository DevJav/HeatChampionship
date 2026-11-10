import { describe, expect, it } from "vitest";
import { carPose, CAR_SCALE, prepareReplay, type Replay } from "@/components/race-log/replay3d/director";
import { isFinished, type LoggedRound } from "./rounds";
import { seededRandom, simulateRace } from "./simulate";
import { tracedTracks } from "./tracks";

const tracks = tracedTracks();
const CAR = { length: 16 * CAR_SCALE, width: 10.5 * CAR_SCALE };

function race(track: (typeof tracks)[number], count: number, seed: number) {
  const ids = Array.from({ length: count }, (_, i) => `car${i}`);
  const rounds = simulateRace(track.layout, ids, seededRandom(seed * 97 + count));
  return { ids, rounds, replay: replayOf(track, ids, rounds) };
}

function replayOf(track: (typeof tracks)[number], ids: string[], rounds: LoggedRound[]) {
  return prepareReplay(track.layout, track.geometry, rounds, ids.map((id) => ({ id, name: id, color: "#ff0000" })), {});
}

const STEP = 0.02;
/** Moments of contact allowed per race, on average */
const MAX_TOUCHES_PER_RACE = 1;
/** Before speeds followed real distance, Japan's long space 29 went well past this */
const MAX_USUAL_SPEED = 18;

/** Moments two cars' bodies overlap, in round-tenths so one long touch counts for little */
function overlaps({ stage }: Replay, ids: string[]) {
  const moments = new Set<number>();
  for (let t = 0; t <= stage.motion.end; t += STEP) {
    const cars = ids.map((id) => carPose(stage, id, t));
    for (let a = 0; a < cars.length; a++) {
      for (let b = a + 1; b < cars.length; b++) {
        const [A, B] = [cars[a], cars[b]];
        // On the same stretch of road, not two roads that happen to meet
        if (Math.abs(A.pos - B.pos) > 3 || Math.abs(A.y - B.y) > 2) continue;
        const [dx, dz] = [B.x - A.x, B.z - A.z];
        const along = Math.abs(dx * A.dx + dz * A.dz);
        const side = Math.abs(-dx * A.dz + dz * A.dx);
        if (along < CAR.length * 0.85 && side < CAR.width * 0.85) moments.add(Math.round(t * 10));
      }
    }
  }
  return moments.size;
}

describe.each(tracks.map((track) => [track.layout.slug, track] as const))("3D motion on %s", (_, track) => {
  const races = [4, 6, 8].flatMap((count) => [1, 2].map((seed) => race(track, count, seed)));

  it("ends every round where the log says", () => {
    for (const { ids, rounds, replay } of races) {
      rounds.forEach((round, r) => {
        for (const id of ids) {
          const logged = round.positions[id];
          // Past the flag the car just rolls on
          if (r > 0 && isFinished(track.layout, rounds[r - 1].positions[id])) continue;
          expect(replay.stage.motion.at(id, r).pos).toBeCloseTo(logged.pos - 0.3 * logged.spot, 1);
        }
      });
    }
  });

  it("stays on the road, with no broken numbers", () => {
    for (const { ids, replay } of races) {
      for (let t = 0; t <= replay.end; t += 0.1) {
        for (const id of ids) {
          const pose = carPose(replay.stage, id, t);
          const now = replay.stage.motion.at(id, t);
          expect([pose.x, pose.y, pose.z, pose.dx, pose.dz, now.lat, now.heading, now.speed, now.accel].every(Number.isFinite)).toBe(true);
          expect(Math.abs(now.lat)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("keeps cars at the usual speed, whatever the length of the spaces", () => {
    const speeds: number[] = [];
    for (const { ids, replay } of races) {
      const { stage } = replay;
      const usual = stage.path.length / track.layout.spacesPerLap;
      for (const id of ids) {
        for (let t = 0; t + STEP <= stage.motion.lastRound; t += STEP) {
          const [a, b] = [carPose(stage, id, t), carPose(stage, id, t + STEP)];
          speeds.push(Math.hypot(b.x - a.x, b.z - a.z) / STEP / usual);
        }
      }
    }
    speeds.sort((a, b) => a - b);
    // In spaces of usual length per round, leaving out the odd burst
    expect(speeds[Math.floor(speeds.length * 0.99)]).toBeLessThan(MAX_USUAL_SPEED);
  });

  it("rarely lets cars touch", () => {
    const touches = races.reduce((sum, { ids, replay }) => sum + overlaps(replay, ids), 0);
    expect(touches).toBeLessThanOrEqual(races.length * MAX_TOUCHES_PER_RACE);
  });

  it("plays from start to end with no gaps between shots", () => {
    for (const { replay } of races) {
      expect(replay.shots[0].start).toBe(replay.start);
      replay.shots.forEach((shot, i) => {
        expect(shot.end).toBeGreaterThan(shot.start);
        if (i > 0) expect(shot.start).toBeCloseTo(replay.shots[i - 1].end, 5);
      });
      expect(replay.shots.at(-1)!.end).toBeGreaterThanOrEqual(replay.end - 1);
    }
  });

  it("stands the podium clear of every road", () => {
    const { replay } = races[0];
    const { path, podium } = replay.stage;
    expect(podium).not.toBeNull();
    for (let arc = 0; arc < path.length; arc += 4) {
      const p = path.at(arc);
      expect(Math.hypot(p.x - podium!.x, p.y - podium!.z)).toBeGreaterThan(path.halfWidth + 30);
    }
  });
});



describe("the podium in small or unfinished races", () => {
  const track = tracks[0];

  it("has the two drivers of a two-car race", () => {
    const { replay, ids } = race(track, 2, 1);
    expect(replay.stage.podium?.ids).toHaveLength(2);
    expect(replay.stage.podium?.ids.toSorted()).toEqual(ids);
    expect(replay.shots.at(-1)?.kind).toBe("podium");
  });

  it("still happens when the log stops before everyone finishes", () => {
    const { ids, rounds } = race(track, 6, 1);
    // Stop at the first round with a car still to finish
    const firstOver = rounds.findIndex((round) => ids.some((id) => isFinished(track.layout, round.positions[id])));
    const cut = rounds.slice(0, firstOver + 1);
    expect(ids.every((id) => isFinished(track.layout, cut.at(-1)!.positions[id]))).toBe(false);
    const replay = replayOf(track, ids, cut);
    expect(replay.stage.podium?.ids).toHaveLength(3);
    expect(replay.shots.at(-1)?.kind).toBe("podium");
    expect(replay.stage.podium!.start).toBeGreaterThan(cut.length - 1);
  });

  it("doesn't happen when nobody has reached the flag", () => {
    const { ids, rounds } = race(track, 4, 1);
    const replay = replayOf(track, ids, rounds.slice(0, 4));
    expect(replay.stage.podium).toBeNull();
    expect(replay.shots.some((shot) => shot.kind === "podium")).toBe(false);
  });
});

describe("a full grid of 12", () => {
  const track = tracks[0];
  const eight = race(track, 8, 1).replay;
  const twelve = race(track, 12, 1);

  it("races on a circuit no bigger than for eight", () => {
    expect(twelve.replay.stage.path.scale).toBeCloseTo(eight.stage.path.scale, 6);
  });

  it("keeps every car on the road and gives the top three their podium", () => {
    for (let t = 0; t <= twelve.replay.end; t += 0.1) {
      for (const id of twelve.ids) expect(Math.abs(twelve.replay.stage.motion.at(id, t).lat)).toBeLessThanOrEqual(1);
    }
    expect(twelve.replay.stage.podium?.ids).toHaveLength(3);
  });
});
