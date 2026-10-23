import { describe, expect, it } from "vitest";
import { checkVote, tallyVotes, VoteError, votingClosesAt, votingPhase } from "./driver-of-the-day";

const finalizedAt = new Date("2026-10-10T20:00:00Z");
const race = { status: "FINISHED", finalizedAt };
const day = (n: number) => new Date(finalizedAt.getTime() + n * 24 * 60 * 60 * 1000);

describe("voting window", () => {
  it("opens with the results and closes seven days later", () => {
    expect(votingClosesAt(race)).toEqual(day(7));
    expect(votingPhase(race, day(1))).toBe("open");
    expect(votingPhase(race, day(7))).toBe("closed");
  });

  it("hasn't started without published results", () => {
    expect(votingClosesAt({ status: "CLOSED", finalizedAt: null })).toBeNull();
    expect(votingPhase({ status: "CLOSED", finalizedAt: null }, day(1))).toBe("not-started");
  });

  it("closes early when an admin closes it", () => {
    const closedEarly = { ...race, dotdClosedAt: day(2) };
    expect(votingClosesAt(closedEarly)).toEqual(day(2));
    expect(votingPhase(closedEarly, day(1))).toBe("open");
    expect(votingPhase(closedEarly, day(2))).toBe("closed");
    expect(votingClosesAt({ ...race, dotdClosedAt: day(9) })).toEqual(day(7));
  });
});

describe("checkVote", () => {
  const drivers = ["ana", "leo", "eva"];
  const vote = (voter: string, driver: string, when = day(1)) => () => checkVote(race, drivers, voter, driver, when);

  it("lets a driver vote for another driver of the race", () => {
    expect(vote("ana", "leo")).not.toThrow();
  });

  it("refuses outsiders, self-votes, unknown drivers and late votes", () => {
    expect(vote("max", "leo")).toThrow(VoteError);
    expect(vote("ana", "ana")).toThrow(VoteError);
    expect(vote("ana", "max")).toThrow(VoteError);
    expect(vote("ana", "leo", day(8))).toThrow(VoteError);
  });
});

describe("tallyVotes", () => {
  it("finds the most voted driver and shares ties", () => {
    expect(tallyVotes([{ driverId: "leo" }, { driverId: "eva" }, { driverId: "leo" }]).winners).toEqual(["leo"]);
    expect(tallyVotes([{ driverId: "leo" }, { driverId: "eva" }]).winners.sort()).toEqual(["eva", "leo"]);
    expect(tallyVotes([]).winners).toEqual([]);
  });
});
