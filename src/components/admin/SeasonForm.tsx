"use client";

import { useActionState } from "react";
import type { Season, SeasonStatus } from "@/generated/prisma/client";
import { SEASON_STATUS } from "@/lib/races";
import { FormLayout, SelectField, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";

const DEFAULT_POINTS = [9, 6, 4, 3, 2, 1];

export function SeasonForm({ action, season }: { action: FormAction; season?: Season }) {
  const [state, formAction] = useActionState(action, {});
  const points = (season?.pointsTable as number[] | undefined) ?? DEFAULT_POINTS;

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={season ? "Guardar cambios" : "Crear temporada"} cancelHref="/admin/temporadas">
        <TextField name="name" label="Nombre" state={state} placeholder="Temporada 2027" defaultValue={season?.name} />
        <TextField
          name="year"
          label="Año"
          type="number"
          state={state}
          defaultValue={season?.year ?? new Date().getFullYear()}
        />
        <SelectField
          name="status"
          label="Estado"
          state={state}
          hint="Solo puede haber una en curso: activar esta termina la anterior."
          defaultValue={season?.status ?? "UPCOMING"}
          options={(Object.keys(SEASON_STATUS) as SeasonStatus[]).map((status) => ({
            value: status,
            label: SEASON_STATUS[status].label,
          }))}
        />
        <TextField
          name="pointsTable"
          label="Puntos por posición"
          state={state}
          hint="Del 1º en adelante, separados por comas. Al cambiarlos se recalculan las carreras ya disputadas."
          defaultValue={points.join(", ")}
        />
      </FormLayout>
    </form>
  );
}
