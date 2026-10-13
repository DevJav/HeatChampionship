"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { setRegistrationOpen } from "@/lib/data/settings";

export async function updateRegistrationOpen(formData: FormData) {
  await requireAdmin();
  await setRegistrationOpen(formData.get("open") === "true");
  refresh();
}
