import { describe, expect, it } from "vitest";
import { BRIDGE_HEIGHT, trackPath } from "./track-path";
import { tracedTracks } from "./tracks";

const tracks = tracedTracks();
const japan = tracks.find((track) => track.geometry.bridge?.length)!;

describe("trackPath", () => {
  it.each(tracks.map((track) => [track.layout.slug, track] as const))("%s: spaces run in order round the lap", (_, { layout, geometry }) => {
    const path = trackPath(layout, geometry, 1.3);
    expect(path.dividers).toHaveLength(layout.spacesPerLap);
    for (let i = 1; i < path.dividers.length; i++) expect(path.dividers[i]).toBeGreaterThan(path.dividers[i - 1]);
    expect(path.dividers.at(-1)).toBeLessThan(path.length);
  });

  it("leaves a track that doesn't cross itself flat", () => {
    for (const { layout, geometry } of tracks.filter((track) => !track.geometry.bridge?.length)) {
      const path = trackPath(layout, geometry, 1.3);
      expect(path.bridge).toBeNull();
      for (let arc = 0; arc < path.length; arc += 25) expect(path.height(arc)).toBe(0);
    }
  });

  describe("Japan's bridge", () => {
    const path = trackPath(japan.layout, japan.geometry, 1.3);
    const closestPair = () => {
      let best = { upper: 0, lower: 0, distance: Infinity };
      for (let upper = 0; upper < path.length; upper += 4) {
        if (path.height(upper) < BRIDGE_HEIGHT) continue;
        for (let lower = 0; lower < path.length; lower += 4) {
          if (path.height(lower) > 0) continue;
          const [a, b] = [path.at(upper), path.at(lower)];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < best.distance) best = { upper, lower, distance };
        }
      }
      return best;
    };

    it("finds the crossing", () => {
      expect(path.bridge).not.toBeNull();
    });

    it("carries one road over the other at full height", () => {
      const { upper, lower, distance } = closestPair();
      expect(distance).toBeLessThan(5);
      expect(path.height(upper)).toBe(BRIDGE_HEIGHT);
      expect(path.height(lower)).toBe(0);
      expect(path.under(lower)).toBe(1);
      expect(path.under(upper)).toBe(0);
    });

    it("climbs gently and without steps", () => {
      for (let arc = -300; arc < path.length; arc += 2) {
        expect(Math.abs(path.slope(arc))).toBeLessThan(0.2);
        expect(Math.abs(path.height(arc + 2) - path.height(arc))).toBeLessThan(0.5);
      }
    });
  });
});
