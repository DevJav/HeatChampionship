import { connection } from "next/server";
import { db } from "../db";

export async function listUsers() {
  await connection();
  return db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, username: true, image: true, role: true, createdAt: true },
  });
}
