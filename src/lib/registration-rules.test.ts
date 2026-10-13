import { describe, expect, it } from "vitest";
import { assignSeats, canWithdraw, signupWindow } from "./registration-rules";

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 1, 12, minutes));
const entry = (id: string, minutes: number) => ({ id, queuedAt: at(minutes) });

describe("assignSeats", () => {
  it("confirms everyone when there is room", () => {
    const seats = assignSeats([entry("a", 0), entry("b", 1)], 8);
    expect([...seats.values()]).toEqual(["CONFIRMED", "CONFIRMED"]);
  });

  it("gives seats in queue order and waitlists the rest", () => {
    const seats = assignSeats([entry("late", 9), entry("first", 1), entry("second", 2)], 2);
    expect(seats.get("first")).toBe("CONFIRMED");
    expect(seats.get("second")).toBe("CONFIRMED");
    expect(seats.get("late")).toBe("WAITLIST");
  });

  it("promotes the waitlist when a seat frees up", () => {
    const queue = [entry("a", 1), entry("b", 2), entry("c", 3)];
    expect(assignSeats(queue, 2).get("c")).toBe("WAITLIST");
    // "a" withdraws → only active entries are passed in
    expect(assignSeats(queue.slice(1), 2).get("c")).toBe("CONFIRMED");
  });

  it("moves the latest confirmed back to the waitlist if seats shrink", () => {
    const seats = assignSeats([entry("a", 1), entry("b", 2), entry("c", 3)], 1);
    expect([seats.get("a"), seats.get("b"), seats.get("c")]).toEqual(["CONFIRMED", "WAITLIST", "WAITLIST"]);
  });

  it("breaks ties on identical queue times deterministically", () => {
    const seats = assignSeats([entry("b", 1), entry("a", 1)], 1);
    expect(seats.get("a")).toBe("CONFIRMED");
  });
});

describe("signupWindow", () => {
  const race = (overrides: Partial<Parameters<typeof signupWindow>[0]> = {}) => ({
    status: "OPEN" as const,
    scheduledAt: at(60),
    signupDeadline: null,
    ...overrides,
  });

  it("is open for an OPEN race before it starts", () => {
    expect(signupWindow(race(), at(0))).toEqual({ open: true });
  });

  it("is closed for drafts, closed and finished races", () => {
    expect(signupWindow(race({ status: "DRAFT" }), at(0))).toEqual({ open: false, reason: "draft" });
    expect(signupWindow(race({ status: "CLOSED" }), at(0))).toEqual({ open: false, reason: "not-open" });
    expect(signupWindow(race({ status: "FINISHED" }), at(0))).toEqual({ open: false, reason: "finished" });
  });

  it("closes at the deadline", () => {
    const withDeadline = race({ signupDeadline: at(30) });
    expect(signupWindow(withDeadline, at(29)).open).toBe(true);
    expect(signupWindow(withDeadline, at(30))).toEqual({ open: false, reason: "deadline" });
  });

  it("closes once the race has started", () => {
    expect(signupWindow(race(), at(60))).toEqual({ open: false, reason: "started" });
  });
});

describe("canWithdraw", () => {
  it("allows withdrawing from open or closed races before the start", () => {
    expect(canWithdraw({ status: "OPEN", scheduledAt: at(60), signupDeadline: null }, at(0))).toBe(true);
    expect(canWithdraw({ status: "CLOSED", scheduledAt: at(60), signupDeadline: null }, at(0))).toBe(true);
  });

  it("refuses after the start or once finished", () => {
    expect(canWithdraw({ status: "CLOSED", scheduledAt: at(60), signupDeadline: null }, at(61))).toBe(false);
    expect(canWithdraw({ status: "FINISHED", scheduledAt: at(60), signupDeadline: null }, at(0))).toBe(false);
  });
});
