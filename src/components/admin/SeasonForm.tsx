"use client";

import { useActionState } from "react";
import type { Season, SeasonStatus } from "@/generated/prisma/client";
import { SEASON_STATUS } from "@/lib/races";
import { FormLayout, SelectField, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";
import { t } from "@/i18n";

const DEFAULT_POINTS = [9, 6, 4, 3, 2, 1];

export function SeasonForm({ action, season }: { action: FormAction; season?: Season }) {
  const [state, formAction] = useActionState(action, {});
  const points = (season?.pointsTable as number[] | undefined) ?? DEFAULT_POINTS;

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={season ? t.admin.saveChanges : t.admin.seasons.create} cancelHref="/admin/temporadas">
        <TextField name="name" label={t.admin.name} state={state} placeholder={t.admin.seasons.namePlaceholder} defaultValue={season?.name} />
        <TextField
          name="year"
          label={t.admin.seasons.year}
          type="number"
          state={state}
          defaultValue={season?.year ?? new Date().getFullYear()}
        />
        <SelectField
          name="status"
          label={t.admin.status}
          state={state}
          hint={t.admin.seasons.statusHint}
          defaultValue={season?.status ?? "UPCOMING"}
          options={(Object.keys(SEASON_STATUS) as SeasonStatus[]).map((status) => ({
            value: status,
            label: SEASON_STATUS[status].label,
          }))}
        />
        <TextField
          name="pointsTable"
          label={t.admin.seasons.pointsTable}
          state={state}
          hint={t.admin.seasons.pointsTableHint}
          defaultValue={points.join(", ")}
        />
      </FormLayout>
    </form>
  );
}
