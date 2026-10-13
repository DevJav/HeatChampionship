"use client";

import { useActionState } from "react";
import type { CarColor } from "@/generated/prisma/client";
import { CheckboxField, FormLayout, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "./types";

export function CarColorForm({ action, color }: { action: FormAction; color?: CarColor }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={color ? "Guardar cambios" : "Crear color"} cancelHref="/admin/colores">
        <TextField name="name" label="Nombre" state={state} defaultValue={color?.name} />
        <TextField
          name="hex"
          label="Color"
          type="color"
          state={state}
          className="[&_input]:h-10 [&_input]:w-24 [&_input]:p-1"
          defaultValue={color?.hex ?? "#d10500"}
        />
        <TextField
          name="sortOrder"
          label="Orden"
          type="number"
          min={0}
          state={state}
          hint="Los colores se listan de menor a mayor."
          defaultValue={color?.sortOrder ?? 0}
        />
        <CheckboxField name="active" label="Activo" state={state} defaultChecked={color?.active ?? true} />
      </FormLayout>
    </form>
  );
}
