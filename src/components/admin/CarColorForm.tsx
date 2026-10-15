"use client";

import { useActionState } from "react";
import type { CarColor } from "@/generated/prisma/client";
import { CheckboxField, FormLayout, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";
import { t } from "@/i18n";

export function CarColorForm({ action, color }: { action: FormAction; color?: CarColor }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={color ? t.admin.saveChanges : t.admin.colors.create} cancelHref="/admin/colores">
        <TextField name="name" label={t.admin.name} state={state} defaultValue={color?.name} />
        <TextField
          name="hex"
          label={t.admin.colors.color}
          type="color"
          state={state}
          className="[&_input]:h-10 [&_input]:w-24 [&_input]:p-1"
          defaultValue={color?.hex ?? "#d10500"}
        />
        <TextField
          name="sortOrder"
          label={t.admin.colors.order}
          type="number"
          min={0}
          state={state}
          hint={t.admin.colors.orderHint}
          defaultValue={color?.sortOrder ?? 0}
        />
        <CheckboxField name="active" label={t.admin.activeM} state={state} defaultChecked={color?.active ?? true} />
      </FormLayout>
    </form>
  );
}
