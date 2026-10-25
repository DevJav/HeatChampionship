import { describe, expect, it } from "vitest";
import { franceLayout as france } from "./france";
import { cornerOf, spaceEdge, spacePath, spacesToCorner } from "./layout";
import { usaGeometry as usa, usaLayout } from "./usa";

// USA corner lines sit before spaces 12, 33, 49 and 57

describe("cornerOf", () => {
  it("maps lap spaces to the stretch after the last corner line crossed", () => {
    expect(cornerOf(usaLayout, 12)).toBe(0);
    expect(cornerOf(usaLayout, 32)).toBe(0);
    expect(cornerOf(usaLayout, 60)).toBe(3);
    expect(cornerOf(usaLayout, 5)).toBe(3); // finish straight
  });
});

describe("spacesToCorner", () => {
  it("matches the numbers printed beside the spaces on the France board", () => {
    expect(spacesToCorner(france, 0)).toBe(11);
    expect(spacesToCorner(france, 59)).toBe(12); // pole
    expect(spacesToCorner(france, 11)).toBe(0);
    expect(spacesToCorner(france, 12)).toBe(7);
    expect(spacesToCorner(france, 47)).toBe(24);
  });
});

describe("spaceEdge", () => {
  it("curves through the space's centre, offset to that edge", () => {
    // Space 57 is in the hairpin after corner 3, where a straight edge would cut the bend
    for (const side of [-1, 1] as const) {
      const [a, c, b] = spaceEdge(usa, 57, side);
      const [x, y, angle] = usa.spaces[57];
      const rad = (angle * Math.PI) / 180;
      // A quadratic curve's halfway point is ¼ start + ½ control + ¼ end
      expect(0.25 * a.x + 0.5 * c.x + 0.25 * b.x).toBeCloseTo(x + Math.cos(rad) * side * usa.halfWidth);
      expect(0.25 * a.y + 0.5 * c.y + 0.25 * b.y).toBeCloseTo(y + Math.sin(rad) * side * usa.halfWidth);
    }
  });

  it("joins the next space's edge, so the outlines leave no gaps", () => {
    expect(spaceEdge(usa, 10, 1)[2]).toEqual(spaceEdge(usa, 11, 1)[0]);
    expect(spaceEdge(usa, 68, -1)[2]).toEqual(spaceEdge(usa, 0, -1)[0]);
  });
});

describe("spacePath", () => {
  it("is a closed outline with two curved edges", () => {
    expect(spacePath(usa, 57)).toMatch(/^M[\d. -]+Q[\d. -]+L[\d. -]+Q[\d. -]+Z$/);
  });
});
