import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { logRegistration } from "./log-activity";
import { assignSeats, canWithdraw, SIGNUP_CLOSED_MESSAGES, signupWindow } from "./registration-rules";
import { t } from "@/i18n";

/** Sign-up database operations. All seat changes go through rebalanceSeats(). */

export class RegistrationError extends Error {}

type Tx = Prisma.TransactionClient;

/** Recompute CONFIRMED/WAITLIST for a race after any change. */
export async function rebalanceSeats(tx: Tx, raceId: string) {
  const race = await tx.race.findUniqueOrThrow({ where: { id: raceId }, select: { maxPlayers: true } });
  const active = await tx.registration.findMany({
    where: { raceId, status: { not: "WITHDRAWN" } },
    select: { id: true, queuedAt: true, status: true },
  });
  const seats = assignSeats(active, race.maxPlayers);
  for (const entry of active) {
    const status = seats.get(entry.id)!;
    if (status !== entry.status) {
      await tx.registration.update({ where: { id: entry.id }, data: { status } });
    }
  }
}

type JoinOptions = {
  /** Admin adding a player: skip the sign-up window check */
  force?: boolean;
};

/** Sign a player up. Returns their resulting status (seat or waitlist). */
export async function joinRace(raceId: string, userId: string, { force = false }: JoinOptions = {}) {
  return db.$transaction(async (tx) => {
    const race = await tx.race.findUnique({ where: { id: raceId } });
    if (!race) throw new RegistrationError(t.races.signupPanel.errors.notFound);
    if (!force) {
      const window = signupWindow(race);
      if (!window.open) throw new RegistrationError(SIGNUP_CLOSED_MESSAGES[window.reason]);
    }

    const existing = await tx.registration.findUnique({ where: { raceId_userId: { raceId, userId } } });
    if (existing && existing.status !== "WITHDRAWN") {
      throw new RegistrationError(t.races.signupPanel.errors.alreadyIn);
    }

    // Re-joining puts you at the back of the queue
    const registration = existing
      ? await tx.registration.update({
          where: { id: existing.id },
          data: { status: "WAITLIST", queuedAt: new Date() },
        })
      : await tx.registration.create({ data: { raceId, userId, status: "WAITLIST" } });

    await rebalanceSeats(tx, raceId);
    await logRegistration(tx, "RACE_SIGNUP", raceId, userId);
    const { status } = await tx.registration.findUniqueOrThrow({ where: { id: registration.id } });
    return status;
  });
}

/** Withdraw a player; the first on the waitlist takes the seat. */
export async function leaveRace(raceId: string, userId: string, { force = false }: JoinOptions = {}) {
  await db.$transaction(async (tx) => {
    const race = await tx.race.findUnique({ where: { id: raceId } });
    if (!race) throw new RegistrationError(t.races.signupPanel.errors.notFound);
    if (!force && !canWithdraw(race)) {
      throw new RegistrationError(t.races.signupPanel.errors.tooLateToLeave);
    }

    const existing = await tx.registration.findUnique({ where: { raceId_userId: { raceId, userId } } });
    if (!existing || existing.status === "WITHDRAWN") return;

    await tx.registration.update({ where: { id: existing.id }, data: { status: "WITHDRAWN" } });
    await rebalanceSeats(tx, raceId);
    await logRegistration(tx, "RACE_WITHDRAWAL", raceId, userId);
  });
}
