import { describe, expect, it } from "vitest";
import { franceGeometry } from "./france";
import {
  anchorAt,
  cumulative,
  fromGeometry,
  parsePath,
  rangeIndices,
  reproject,
  serializeGeometry,
  smooth,
  toGeometry,
} from "./geometry-edit";
import { greatBritainGeometry } from "./great-britain";
import { italyGeometry } from "./italy";
import { usaGeometry } from "./usa";

const angleGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe("parsePath", () => {
  it("reads the vertices of a closed path", () => {
    expect(parsePath("M1 2 L3.5 -4 L5 6 Z")).toEqual([
      { x: 1, y: 2 },
      { x: 3.5, y: -4 },
      { x: 5, y: 6 },
    ]);
  });
});

describe("anchorAt", () => {
  it("points the normal to the right of travel (y grows downwards)", () => {
    // Travelling right along y = 0: the right-hand side is +y, 90°
    const square = parsePath("M0 0 L100 0 L100 100 L0 100 Z");
    const [x, y, angle] = anchorAt(square, cumulative(square), 50);
    expect([x, y]).toEqual([50, 0]);
    expect(angle).toBe(90);
  });
});

describe("fromGeometry → toGeometry", () => {
  it.each([
    ["usa", usaGeometry],
    ["france", franceGeometry],
    ["great britain", greatBritainGeometry],
    ["italy", italyGeometry],
  ] as const)("keeps %s's dividers and spaces where they were", (_, geometry) => {
    const back = toGeometry(fromGeometry(geometry));
    expect(back.path).toBe(geometry.path.replace(/(\d)\.0(?=\D)/g, "$1"));
    expect(back.dividers).toHaveLength(geometry.dividers.length);
    back.dividers.forEach(([x, y, a], i) => {
      const [x0, y0, a0] = geometry.dividers[i];
      expect(Math.hypot(x - x0, y - y0)).toBeLessThan(2);
      expect(angleGap(a, a0)).toBeLessThan(15);
    });
    back.spaces.forEach(([x, y], i) => {
      const [x0, y0] = geometry.spaces[i];
      expect(Math.hypot(x - x0, y - y0)).toBeLessThan(1.5);
    });
  });
});

describe("reproject", () => {
  it("keeps dividers on the same spot when a vertex is added on the line", () => {
    const model = fromGeometry(italyGeometry);
    const v = model.vertices;
    const mid = { x: (v[10].x + v[11].x) / 2, y: (v[10].y + v[11].y) / 2 };
    const vertices = [...v.slice(0, 11), mid, ...v.slice(11)];
    const before = toGeometry(model).dividers;
    const after = toGeometry({ ...model, vertices, dividers: reproject(model, vertices) }).dividers;
    after.forEach(([x, y], i) => expect(Math.hypot(x - before[i][0], y - before[i][1])).toBeLessThan(0.2));
  });
});

describe("smooth", () => {
  it("pulls a spike back towards its neighbours and leaves the rest alone", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 8 },
      { x: 30, y: 0 },
      { x: 40, y: 0 },
    ];
    const out = smooth(line, [2], 1);
    expect(out[2].y).toBe(4);
    expect(out[1]).toEqual(line[1]);
  });

  it("walks ranges round the loop", () => {
    expect(rangeIndices(3, 1, 5)).toEqual([3, 4, 0, 1]);
  });
});

describe("serializeGeometry", () => {
  it("writes the block the track files use", () => {
    const code = serializeGeometry("italyGeometry", italyGeometry);
    expect(code).toMatch(/^export const italyGeometry: TrackGeometry = \{\n {2}width: 1000,/);
    expect(code.trimEnd().endsWith("};")).toBe(true);
  });
});
