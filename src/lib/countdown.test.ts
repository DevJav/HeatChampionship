import { describe, expect, it } from "vitest";
import { countdownParts } from "./countdown";

const at = (iso: string) => new Date(iso).getTime();

describe("countdownParts", () => {
  it("splits the time left into days, hours, minutes and seconds", () => {
    expect(countdownParts(at("2026-11-14T17:00:00Z"), at("2026-10-13T15:28:31Z"))).toEqual({
      days: 32,
      hours: 1,
      minutes: 31,
      seconds: 29,
    });
  });

  it("rounds partial seconds down", () => {
    expect(countdownParts(1_500, 0)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it("stops at zero once the target has passed", () => {
    expect(countdownParts(0, 5_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
