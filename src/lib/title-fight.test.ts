import { describe, expect, it } from "vitest";
import { titleFight } from "./title-fight";

const TABLE = [9, 6, 4, 3, 2, 1];
const rows = (...points: number[]) => points.map((p, i) => ({ userId: `d${i}`, points: p }));

describe("titleFight", () => {
  it("is null when nothing is left to race", () => {
    expect(titleFight(rows(20, 10), TABLE, 0)).toBeNull();
  });

  it("keeps everyone within reach in the fight, matching the leader included", () => {
    const fight = titleFight(rows(30, 21, 12, 11), TABLE, 2)!;
    expect(fight.pointsLeft).toBe(18);
    expect(fight.contenders.map((c) => c.userId)).toEqual(["d0", "d1", "d2"]);
    expect(fight.contenders[2]).toMatchObject({ maxPoints: 30, gap: 18 });
  });

  it("finds the worst finish that seals the title at the next race", () => {
    // One race left, rival 20 pts: they score 9 if they win, 6 if the leader wins
    expect(titleFight(rows(22, 20), TABLE, 1)!.clinchPosition).toBe(1); // 22+9 > 20+6
    expect(titleFight(rows(25, 20), TABLE, 1)!.clinchPosition).toBe(2); // 25+6 > 20+9
    expect(titleFight(rows(28, 20), TABLE, 1)!.clinchPosition).toBe(5); // 28+2 > 20+9
    expect(titleFight(rows(20, 20), TABLE, 2)!.clinchPosition).toBeNull();
  });

  it("knows when it's already decided", () => {
    expect(titleFight(rows(40, 20), TABLE, 2)!.decided).toBe(true);
    expect(titleFight(rows(40, 20), TABLE, 2)!.contenders).toHaveLength(1);
  });
});
