import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { db } from "./db";
import { getSettings } from "./data/settings";

export const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;

/** Players log in by username; Better Auth still needs a unique email. */
export function placeholderEmail(username: string) {
  return `${username.toLowerCase()}@users.heat.local`;
}

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN,
  },
  session: {
    // Friends stay logged in for a month between races
    expiresIn: 60 * 60 * 24 * 30,
  },
  plugins: [
    username({
      minUsernameLength: USERNAME_MIN,
      maxUsernameLength: USERNAME_MAX,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
    }),
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    // Must be last: lets server actions set auth cookies
    nextCookies(),
  ],
  hooks: {
    // Enforced here (not only in the form) because the auth API is public
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const { registrationOpen } = await getSettings();
      if (!registrationOpen) {
        throw new APIError("FORBIDDEN", {
          code: "REGISTRATION_CLOSED",
          message: "Registration is closed",
        });
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
