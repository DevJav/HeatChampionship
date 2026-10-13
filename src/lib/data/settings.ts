import { connection } from "next/server";
import { db } from "../db";

/** App-wide settings (single row, created on first read). */
export async function getSettings() {
  await connection();
  return db.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function setRegistrationOpen(open: boolean) {
  return db.appSettings.upsert({
    where: { id: 1 },
    update: { registrationOpen: open },
    create: { id: 1, registrationOpen: open },
  });
}
