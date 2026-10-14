"use client";

import { useActionState } from "react";
import { siteConfig } from "@/config/site";
import type { Race, RaceStatus } from "@/generated/prisma/client";
import { toLocalInput } from "@/lib/dates";
import { RACE_STATUS } from "@/lib/races";
import { DateTimeField, FormLayout, SelectField, TextareaField, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";

type Option = { id: string; name: string };

type RaceFormProps = {
  action: FormAction;
  seasons: Option[];
  tracks: (Option & { defaultLaps: number | null })[];
  /** Existing race when editing */
  race?: Race;
  /** Defaults when creating */
  defaults?: { seasonId?: string; round?: number };
};

const editableStatuses: RaceStatus[] = ["DRAFT", "UPCOMING", "OPEN", "CLOSED"];

export function RaceForm({ action, seasons, tracks, race, defaults }: RaceFormProps) {
  const [state, formAction] = useActionState(action, {});
  const finished = race?.status === "FINISHED";

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={race ? "Guardar cambios" : "Crear carrera"} cancelHref="/admin/carreras">
        <SelectField
          name="seasonId"
          label="Temporada"
          state={state}
          defaultValue={race?.seasonId ?? defaults?.seasonId}
          options={seasons.map((s) => ({ value: s.id, label: s.name }))}
        />
        <TextField
          name="round"
          label="Ronda"
          type="number"
          min={1}
          state={state}
          defaultValue={race?.round ?? defaults?.round}
        />
        <SelectField
          name="trackId"
          label="Circuito"
          state={state}
          placeholder="Elige un circuito"
          defaultValue={race?.trackId}
          options={tracks.map((t) => ({
            value: t.id,
            label: t.defaultLaps ? `${t.name} (${t.defaultLaps} vueltas)` : t.name,
          }))}
        />
        <TextField
          name="laps"
          label="Vueltas"
          type="number"
          min={1}
          state={state}
          hint="Vacío = las del circuito"
          defaultValue={race?.laps}
        />
        <DateTimeField
          name="scheduledAt"
          label="Fecha y hora"
          state={state}
          hint={`Hora de ${siteConfig.timeZone.split("/")[1]}`}
          defaultValue={race ? toLocalInput(race.scheduledAt) : undefined}
        />
        <DateTimeField
          name="signupDeadline"
          label="Cierre de inscripciones"
          clearable
          state={state}
          hint="Opcional. Sin fecha, se cierran al empezar la carrera."
          defaultValue={race?.signupDeadline ? toLocalInput(race.signupDeadline) : undefined}
        />
        <TextField name="location" label="Lugar" state={state} placeholder="Casa de Javier" defaultValue={race?.location} />
        <TextField
          name="maxPlayers"
          label="Plazas"
          type="number"
          min={2}
          max={siteConfig.maxPlayersPerRace}
          state={state}
          defaultValue={race?.maxPlayers ?? siteConfig.maxPlayersPerRace}
        />
        <SelectField
          name="status"
          label="Estado"
          state={state}
          disabled={finished}
          hint={
            finished
              ? "Finalizada al registrar resultados."
              : "Borrador: oculta. Abierta: se pueden inscribir hasta el cierre o el inicio de la carrera."
          }
          defaultValue={race?.status ?? "DRAFT"}
          options={(finished ? (["FINISHED"] as RaceStatus[]) : editableStatuses).map((status) => ({
            value: status,
            label: RACE_STATUS[status].label,
          }))}
        />
        <TextareaField
          name="notes"
          label="Notas"
          state={state}
          className="md:col-span-2"
          placeholder="Reglas especiales, qué traer, módulos que se usan…"
          defaultValue={race?.notes}
        />
      </FormLayout>
    </form>
  );
}
