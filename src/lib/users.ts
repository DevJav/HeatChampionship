import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { placeholderEmail } from "./auth";
import { db } from "./db";

type NewUser = {
  username: string;
  name: string;
  password: string;
  role?: "admin" | "user";
};

/**
 * Creates a user with a username/password login directly in the database,
 * bypassing the public sign-up endpoint (and its "registration closed" check).
 * Used by the seed script; the same shape Better Auth writes on sign-up.
 */
export async function createUserWithPassword({
  username,
  name,
  password,
  role = "user",
}: NewUser) {
  const id = randomUUID();
  const normalized = username.toLowerCase();
  return db.user.create({
    data: {
      id,
      name,
      username: normalized,
      displayUsername: username,
      email: placeholderEmail(normalized),
      role,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
}
