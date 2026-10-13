"use client";

import { useActionState } from "react";
import type { Track } from "@/generated/prisma/client";
import { CheckboxField, FormLayout, SelectField, TextareaField, TextField } from "@/components/forms/FormFields";
import { countryOptions } from "@/lib/countries";
import type { FormAction } from "@/lib/forms";

const countries = countryOptions();

export function TrackForm({ action, track }: { action: FormAction; track?: Track }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={track ? "Guardar cambios" : "Crear circuito"} cancelHref="/admin/circuitos">
        <TextField name="name" label="Nombre" state={state} placeholder="Italia" defaultValue={track?.name} />
        <SelectField
          name="countryCode"
          label="País"
          hint="Su bandera aparece en la cabecera de las carreras."
          state={state}
          options={countries}
          placeholder="Sin país"
          defaultValue={track?.countryCode ?? ""}
        />
        <TextField
          name="expansion"
          label="Juego / expansión"
          state={state}
          placeholder="Juego base"
          defaultValue={track?.expansion}
        />
        <TextField
          name="defaultLaps"
          label="Vueltas por defecto"
          type="number"
          min={1}
          state={state}
          defaultValue={track?.defaultLaps}
        />
        <TextareaField
          name="description"
          label="Descripción"
          state={state}
          className="md:col-span-2"
          defaultValue={track?.description}
        />
        <CheckboxField
          name="active"
          label="Activo (se puede elegir en carreras nuevas)"
          state={state}
          defaultChecked={track?.active ?? true}
        />
      </FormLayout>
    </form>
  );
}
