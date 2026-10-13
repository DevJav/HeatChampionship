import { describe, expect, it } from "vitest";
import { niceTicks } from "./chart-scale";

describe("niceTicks", () => {
  it("steps by clean numbers up past the maximum", () => {
    expect(niceTicks(38)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(44)).toEqual([0, 20, 40, 60]);
  });

  it("never steps below 1", () => {
    expect(niceTicks(2)).toEqual([0, 1, 2]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
