"use client";

import { useActionState } from "react";
import { CheckboxField, FormLayout, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";

export function UserNameForm({ action, name }: { action: FormAction; name: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel="Guardar nombre">
        <TextField name="name" label="Nombre visible" state={state} defaultValue={name} className="md:col-span-2" />
      </FormLayout>
    </form>
  );
}

export function UserPasswordForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel="Cambiar contraseña">
        <TextField
          name="newPassword"
          label="Contraseña nueva"
          hint="Déjala vacía para generar una fácil de dictar (p. ej. rebufo-curva-47)."
          autoComplete="off"
          state={state}
          className="md:col-span-2"
        />
        <CheckboxField
          name="logout"
          label="Cerrar sus sesiones abiertas"
          state={state}
          defaultChecked
          className="md:col-span-2"
        />
      </FormLayout>
    </form>
  );
}
