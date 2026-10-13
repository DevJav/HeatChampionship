import { describe, expect, it } from "vitest";
import { fromLocalInput, toLocalInput } from "./dates";

const TZ = "Europe/Madrid";

describe("fromLocalInput", () => {
  it("interprets winter times as CET (UTC+1)", () => {
    expect(fromLocalInput("2026-11-14T19:30", TZ)?.toISOString()).toBe("2026-11-14T18:30:00.000Z");
  });

  it("interprets summer times as CEST (UTC+2)", () => {
    expect(fromLocalInput("2026-07-04T19:30", TZ)?.toISOString()).toBe("2026-07-04T17:30:00.000Z");
  });

  it("handles the day DST ends", () => {
    // 25 Oct 2026: clocks go back at 03:00 CEST → 02:00 CET
    expect(fromLocalInput("2026-10-25T12:00", TZ)?.toISOString()).toBe("2026-10-25T11:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(fromLocalInput("", TZ)).toBeNull();
    expect(fromLocalInput("14/11/2026 19:30", TZ)).toBeNull();
  });
});

describe("toLocalInput", () => {
  it("formats in Madrid wall-clock time", () => {
    expect(toLocalInput(new Date("2026-11-14T18:30:00Z"), TZ)).toBe("2026-11-14T19:30");
    expect(toLocalInput(new Date("2026-07-04T17:30:00Z"), TZ)).toBe("2026-07-04T19:30");
  });

  it("round-trips with fromLocalInput", () => {
    for (const value of ["2026-01-01T00:00", "2026-03-29T12:15", "2026-12-31T23:59"]) {
      expect(toLocalInput(fromLocalInput(value, TZ)!, TZ)).toBe(value);
    }
  });
});
