import { Prisma } from "@/generated/prisma/client";

/** True when a write failed on a unique constraint (Prisma P2002). */
export function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
