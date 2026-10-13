"use client";

import { useActionState } from "react";
import type { Upgrade } from "@/generated/prisma/client";
import { CheckboxField, FormLayout, TextareaField, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "./types";

export function UpgradeForm({ action, upgrade }: { action: FormAction; upgrade?: Upgrade }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={upgrade ? "Guardar cambios" : "Crear mejora"} cancelHref="/admin/mejoras">
        <TextField name="name" label="Nombre" state={state} defaultValue={upgrade?.name} />
        <TextField
          name="expansion"
          label="Juego / expansión"
          state={state}
          placeholder="Juego base"
          defaultValue={upgrade?.expansion}
        />
        <TextareaField
          name="description"
          label="Descripción"
          state={state}
          className="md:col-span-2"
          defaultValue={upgrade?.description}
        />
        <CheckboxField
          name="active"
          label="Activa (se puede elegir al registrar resultados)"
          state={state}
          defaultChecked={upgrade?.active ?? true}
        />
      </FormLayout>
    </form>
  );
}
