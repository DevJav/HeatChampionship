import { describe, expect, it } from "vitest";
import { blockedDaysOf, daysBetween, isBlockableDay, isOpenDay, monthsToRange, openDays, pollMonths, rankDays, type DayAnswer } from "./date-poll";

describe("ranges", () => {
  it("lists every day, across months and leap days", () => {
    expect(daysBetween("2028-02-27", "2028-03-01")).toEqual(["2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"]);
    expect(daysBetween("2026-11-30", "2026-11-30")).toEqual(["2026-11-30"]);
  });

  it("turns months into the first and last day", () => {
    expect(monthsToRange("2026-11", "2026-11")).toEqual({ firstDay: "2026-11-01", lastDay: "2026-11-30" });
    expect(monthsToRange("2026-12", "2027-02")).toEqual({ firstDay: "2026-12-01", lastDay: "2027-02-28" });
  });

  it("shows each month the poll touches", () => {
    expect(pollMonths({ firstDay: "2026-12-01", lastDay: "2027-01-31" })).toEqual(["2026-12", "2027-01"]);
  });

  it("reads stored blocked days defensively", () => {
    expect(blockedDaysOf(["2026-11-03", 4, "nope"])).toEqual(["2026-11-03"]);
    expect(blockedDaysOf(null)).toEqual([]);
  });
});

describe("open days", () => {
  const poll = { firstDay: "2026-11-01", lastDay: "2026-11-07", blockedDays: ["2026-11-05"] };
  const today = "2026-11-03";

  it("skips past, blocked and out-of-range days", () => {
    expect(openDays(poll, today)).toEqual(["2026-11-03", "2026-11-04", "2026-11-06", "2026-11-07"]);
    expect(isOpenDay(poll, "2026-11-08", today)).toBe(false);
    expect(isOpenDay(poll, "bad", today)).toBe(false);
  });

  it("lets the admin unblock a blocked day but not touch the past", () => {
    expect(isBlockableDay(poll, "2026-11-05", today)).toBe(true);
    expect(isBlockableDay(poll, "2026-11-02", today)).toBe(false);
  });
});

describe("rankDays", () => {
  const answers: DayAnswer[] = [
    { userId: "ana", day: "2026-11-14", answer: "YES" },
    { userId: "leo", day: "2026-11-14", answer: "MAYBE" },
    { userId: "eva", day: "2026-11-14", answer: "NO" },
    { userId: "ana", day: "2026-11-20", answer: "YES" },
    { userId: "leo", day: "2026-11-20", answer: "MAYBE" },
    { userId: "ana", day: "2026-11-21", answer: "YES" },
    { userId: "leo", day: "2026-11-21", answer: "YES" },
    { userId: "eva", day: "2026-11-22", answer: "NO" },
  ];
  const days = ["2026-11-14", "2026-11-20", "2026-11-21", "2026-11-22"];

  it("puts more yeses first, then fewer noes, and leaves out days nobody can do", () => {
    const ranked = rankDays(days, answers);
    expect(ranked.map((d) => d.day)).toEqual(["2026-11-21", "2026-11-20", "2026-11-14"]);
    expect(ranked[1]).toEqual({ day: "2026-11-20", yes: ["ana"], maybe: ["leo"], no: [], score: 1.5 });
  });

  it("only counts the days asked for", () => {
    expect(rankDays(["2026-11-14"], answers).map((d) => d.day)).toEqual(["2026-11-14"]);
  });
});
