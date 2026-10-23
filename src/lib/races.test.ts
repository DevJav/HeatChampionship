import { describe, expect, it } from "vitest";
import { formatRaceDate } from "./format";
import { raceMonth, tbdPlaceholder } from "./races";

describe("races with the day to be decided", () => {
  it("are stored at the last minute of their month, Madrid time", () => {
    expect(tbdPlaceholder("2026-12").toISOString()).toBe("2026-12-31T22:59:00.000Z");
    // Summer time
    expect(tbdPlaceholder("2027-06").toISOString()).toBe("2027-06-30T21:59:00.000Z");
    expect(raceMonth({ scheduledAt: tbdPlaceholder("2026-12") })).toBe("2026-12");
  });

  it("show only their month", () => {
    const scheduledAt = tbdPlaceholder("2026-12");
    expect(formatRaceDate({ scheduledAt, dateTbd: true })).toBe("diciembre 2026 · fecha por decidir");
    expect(formatRaceDate({ scheduledAt: new Date("2026-11-14T17:00:00Z"), dateTbd: false })).toBe("sábado, 14 de noviembre, 18:00");
  });
});
