import { describe, expect, it } from "vitest";
import { franceGeometry, franceLayout as france } from "./france";
import { greatBritainGeometry, greatBritainLayout as britain } from "./great-britain";
import { italyGeometry, italyLayout as italy } from "./italy";
import { japanGeometry, japanLayout as japan } from "./japan";
import { mexicoGeometry, mexicoLayout as mexico } from "./mexico";
import { netherlandsGeometry, netherlandsLayout as netherlands } from "./netherlands";
import { spainGeometry, spainLayout as spain } from "./spain";
import { bridgePath, cornerOf, spaceEdge, spacePath, spacesToCorner } from "./layout";
import { usaGeometry as usa, usaLayout } from "./usa";

describe("traced tracks", () => {
  it.each([
    ["usa", usaLayout, usa],
    ["france", france, franceGeometry],
    ["great britain", britain, greatBritainGeometry],
    ["italy", italy, italyGeometry],
    ["spain", spain, spainGeometry],
    ["japan", japan, japanGeometry],
    ["netherlands", netherlands, netherlandsGeometry],
    ["mexico", mexico, mexicoGeometry],
  ] as const)("%s has a divider and a centre for every space, and a badge per corner", (_, layout, geometry) => {
    expect(geometry.dividers).toHaveLength(layout.spacesPerLap);
    expect(geometry.spaces).toHaveLength(layout.spacesPerLap);
    expect(geometry.badges).toHaveLength(layout.corners.length);
    const befores = layout.corners.map((c) => c.before);
    expect(befores).toEqual([...befores].sort((a, b) => a - b));
  });
});

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

  it("matches the Great Britain card's 15-7-6-5-30 stretches", () => {
    expect(spacesToCorner(britain, 0)).toBe(14);
    expect(spacesToCorner(britain, 62)).toBe(15); // pole
    expect(spacesToCorner(britain, 15)).toBe(14);
    expect(spacesToCorner(britain, 30)).toBe(6);
    expect(spacesToCorner(britain, 37)).toBe(5);
    expect(spacesToCorner(britain, 43)).toBe(4);
    expect(spacesToCorner(britain, 48)).toBe(29);
  });

  it("matches the numbers on the Italy board: 8, 6 and 37 after each corner", () => {
    expect(spacesToCorner(italy, 0)).toBe(9);
    expect(spacesToCorner(italy, 53)).toBe(10); // pole
    expect(spacesToCorner(italy, 10)).toBe(8);
    expect(spacesToCorner(italy, 19)).toBe(6);
    expect(spacesToCorner(italy, 26)).toBe(37);
  });

  it("matches the numbers on the Spain board, a single long lap", () => {
    expect(spacesToCorner(spain, 0)).toBe(10);
    expect(spacesToCorner(spain, 108)).toBe(11); // pole
    expect(spain.corners.map((c) => spacesToCorner(spain, c.before))).toEqual([3, 13, 2, 11, 20, 19, 6, 2, 2, 4, 16]);
  });

  it("matches the numbers on the Japan board, with nothing under the bridge", () => {
    expect(spacesToCorner(japan, 0)).toBe(9);
    expect(spacesToCorner(japan, 59)).toBe(10); // pole
    expect(japan.corners.map((c) => spacesToCorner(japan, c.before))).toEqual([1, 5, 26, 7, 16]);
    // 15 on the piece above the bridge, 14 where the road comes out below it
    expect(spacesToCorner(japan, 29)).toBe(15);
    expect(spacesToCorner(japan, 30)).toBe(14);
  });
});

describe("spacesToCorner on the Netherlands board", () => {
  it("matches the numbers printed beside the spaces: 9-4-3-10-8-21", () => {
    expect(spacesToCorner(netherlands, 0)).toBe(8);
    expect(spacesToCorner(netherlands, 54)).toBe(9); // pole
    expect(netherlands.corners.map((c) => spacesToCorner(netherlands, c.before))).toEqual([3, 2, 9, 7, 29]);
  });
});

describe("spacesToCorner on the Mexico board", () => {
  it("matches the numbers printed beside the spaces: 14-5-19-6-6-1-9", () => {
    expect(spacesToCorner(mexico, 0)).toBe(13);
    expect(spacesToCorner(mexico, 59)).toBe(14); // pole
    expect(mexico.corners.map((c) => spacesToCorner(mexico, c.before))).toEqual([4, 18, 5, 5, 0, 22]);
  });
});

describe("bridge", () => {
  it("runs along the bridge spaces, from the first one's divider to the last one's end", () => {
    const d = bridgePath(japanGeometry);
    const [x0, y0] = japanGeometry.dividers[0];
    const [x3, y3] = japanGeometry.dividers[3];
    expect(d.startsWith(`M${x0} ${y0}Q`)).toBe(true);
    expect(d.endsWith(`${x3} ${y3}`)).toBe(true);
    expect(d.match(/Q/g)).toHaveLength(japanGeometry.bridge!.length);
    expect(bridgePath(spainGeometry)).toBe("");
  });

  it("keeps Japan's space 29 on the piece above the bridge, not under it", () => {
    // The bridge's top edge is at y ≈ 310 where the stretch from the top dives under it
    const [, y] = japanGeometry.spaces[29];
    expect(y).toBeGreaterThan(japanGeometry.dividers[29][1]);
    expect(y).toBeLessThan(310);
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
