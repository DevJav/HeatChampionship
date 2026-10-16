"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { cleanRadio, RADIO_MAX, RadioError } from "@/lib/radio";
import { requireUser } from "@/lib/session";
import { t } from "@/i18n";

/** Sets or clears the signed-in driver's radio line for a finished race they drove. */
export async function saveRadio(_prev: FormState, formData: FormData): Promise<FormState> {
  const raceId = String(formData.get("raceId") ?? "");
  const user = await requireUser(`/carreras/${raceId}`);

  const result = await db.raceResult.findFirst({
    where: { raceId, userId: user.id, race: { status: "FINISHED" } },
    select: { id: true },
  });
  if (!result) return { error: t.radio.errors.notDriver };

  let radio: string | null;
  try {
    radio = cleanRadio(String(formData.get("radio") ?? ""), t.radio.errors.tooLong(RADIO_MAX));
  } catch (error) {
    if (error instanceof RadioError) return { error: error.message };
    throw error;
  }

  await db.raceResult.update({ where: { id: result.id }, data: { radio } });
  refresh();
  return { message: radio ? t.radio.saved : t.radio.cleared };
}
