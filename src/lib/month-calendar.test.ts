import { describe, expect, it } from "vitest";
import { addMonths, formatDayKey, formatMonth, isMonthKey, lastDayOf, monthRange, monthWeeks } from "./month-calendar";

describe("monthWeeks", () => {
  it("starts weeks on Monday", () => {
    // 1 Nov 2026 is a Sunday: the grid opens with Mon 26 Oct
    const weeks = monthWeeks("2026-11");
    expect(weeks[0][0]).toEqual({ key: "2026-10-26", day: 26, inMonth: false });
    expect(weeks[0][6]).toEqual({ key: "2026-11-01", day: 1, inMonth: true });
  });

  it("covers the month in whole weeks", () => {
    const weeks = monthWeeks("2026-11");
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.at(-1)!.at(-1)).toEqual({ key: "2026-12-06", day: 6, inMonth: false });
    expect(weeks.flat().filter((day) => day.inMonth)).toHaveLength(30);
  });

  it("needs no leading days when the month starts on Monday", () => {
    // 1 Feb 2027 is a Monday, and February 2027 fits in exactly four weeks
    const weeks = monthWeeks("2027-02");
    expect(weeks[0][0].key).toBe("2027-02-01");
    expect(weeks).toHaveLength(4);
  });
});

describe("addMonths / monthRange", () => {
  it("crosses year boundaries", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("lists every month in between, both ends included", () => {
    expect(monthRange("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(monthRange("2026-11", "2026-11")).toEqual(["2026-11"]);
  });
});

describe("formatting", () => {
  it("shows days as dd/mm/yyyy", () => {
    expect(formatDayKey("2026-03-07")).toBe("07/03/2026");
  });

  it("names months in Spanish", () => {
    expect(formatMonth("2026-11")).toBe("noviembre 2026");
  });
});

describe("month keys", () => {
  it("knows the last day, leap years included", () => {
    expect(lastDayOf("2026-11")).toBe("2026-11-30");
    expect(lastDayOf("2028-02")).toBe("2028-02-29");
    expect(lastDayOf("2026-12")).toBe("2026-12-31");
  });

  it("recognises month keys", () => {
    expect(isMonthKey("2026-12")).toBe(true);
    expect(isMonthKey("2026-12-01")).toBe(false);
  });
});
