import type { RaceStatus, RegistrationStatus } from "@/generated/prisma/client";
import { t } from "@/i18n";

/** Pure sign-up rules — no database access, unit-tested in registration-rules.test.ts. */

type QueueEntry = { id: string; queuedAt: Date };

/**
 * Seats go to the earliest in the queue; everyone after `maxPlayers` waits.
 * Returns the status each active (non-withdrawn) entry should have.
 */
export function assignSeats<T extends QueueEntry>(
  entries: T[],
  maxPlayers: number,
): Map<string, Exclude<RegistrationStatus, "WITHDRAWN">> {
  const ordered = [...entries].sort(
    (a, b) => a.queuedAt.getTime() - b.queuedAt.getTime() || a.id.localeCompare(b.id),
  );
  return new Map(ordered.map((entry, index) => [entry.id, index < maxPlayers ? "CONFIRMED" : "WAITLIST"]));
}

export type WindowRace = { status: RaceStatus; scheduledAt: Date; signupDeadline: Date | null };

export type SignupWindow =
  | { open: true }
  | { open: false; reason: "draft" | "upcoming" | "not-open" | "deadline" | "started" | "finished" };

/** Can players join right now? Requires status OPEN, before the deadline and the race start. */
export function signupWindow(race: WindowRace, now = new Date()): SignupWindow {
  if (race.status === "DRAFT") return { open: false, reason: "draft" };
  if (race.status === "FINISHED") return { open: false, reason: "finished" };
  if (now >= race.scheduledAt) return { open: false, reason: "started" };
  if (race.status === "UPCOMING") return { open: false, reason: "upcoming" };
  if (race.status !== "OPEN") return { open: false, reason: "not-open" };
  if (race.signupDeadline && now >= race.signupDeadline) return { open: false, reason: "deadline" };
  return { open: true };
}

/**
 * What a race looks like to players right now. The stored status is what the
 * admin set; the deadline and start time move it along on their own.
 */
export type RacePhase = "DRAFT" | "UPCOMING" | "OPEN" | "CLOSED" | "AWAITING_RESULTS" | "FINISHED";

export function racePhase(race: WindowRace, now = new Date()): RacePhase {
  if (race.status === "DRAFT" || race.status === "FINISHED") return race.status;
  if (now >= race.scheduledAt) return "AWAITING_RESULTS";
  if (race.status === "UPCOMING") return "UPCOMING";
  return signupWindow(race, now).open ? "OPEN" : "CLOSED";
}

/** Players may drop out on their own until the race starts (waitlist moves up). */
export function canWithdraw(race: WindowRace, now = new Date()) {
  return (race.status === "UPCOMING" || race.status === "OPEN" || race.status === "CLOSED") && now < race.scheduledAt;
}

export const SIGNUP_CLOSED_MESSAGES: Record<Exclude<SignupWindow, { open: true }>["reason"], string> =
  t.races.signupPanel.closed;
