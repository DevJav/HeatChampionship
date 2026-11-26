import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { db } from "./db";
import { getSettings } from "./data/settings";
import { sendPasswordReset } from "./email/send";
import { logPlayerJoined } from "./log-activity";

import { PASSWORD_MIN, RESET_LINK_HOURS, USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from "./auth-rules";

export { PASSWORD_MIN, RESET_LINK_HOURS, USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from "./auth-rules";

/** Players log in by username; Better Auth still needs a unique email. */
export function placeholderEmail(username: string) {
  return `${username.toLowerCase()}@users.heat.local`;
}

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN,
    // "Forgot your password?": the link goes to the driver's contact email (see /recuperar)
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordReset(user.id, token);
    },
    resetPasswordTokenExpiresIn: RESET_LINK_HOURS * 60 * 60,
    // Whoever had the old password is logged out everywhere
    revokeSessionsOnPasswordReset: true,
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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await logPlayerJoined(user.id);
        },
      },
    },
  },
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
