import { connection } from "next/server";
import { RESET_EMAIL_COOLDOWN_SECONDS } from "../auth-rules";
import { db } from "../db";

/** Better Auth keeps each reset link as a verification row: identifier "reset-password:<token>", value = user id. */
const PREFIX = "reset-password:";

/** Whether a "choose a new password" link still works (it exists, unused and not expired). */
export async function resetLinkIsValid(token: string) {
  await connection();
  if (!token) return false;
  const row = await db.verification.findFirst({
    where: { identifier: `${PREFIX}${token}`, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return !!row;
}

/** A reset email went out to this driver moments ago: don't send another one yet. */
export async function resetEmailedRecently(userId: string) {
  const row = await db.verification.findFirst({
    where: {
      identifier: { startsWith: PREFIX },
      value: userId,
      createdAt: { gt: new Date(Date.now() - RESET_EMAIL_COOLDOWN_SECONDS * 1000) },
    },
    select: { id: true },
  });
  return !!row;
}
