"use client";

import { useActionState } from "react";
import { changePassword } from "@/actions/profile";
import { FormLayout, TextField } from "@/components/forms/FormFields";

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  return (
    <form action={action}>
      <FormLayout state={state} submitLabel="Cambiar contraseña">
        <TextField
          name="currentPassword"
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          state={state}
          className="md:col-span-2"
        />
        <TextField name="newPassword" label="Nueva contraseña" type="password" autoComplete="new-password" state={state} />
        <TextField name="confirm" label="Repite la nueva" type="password" autoComplete="new-password" state={state} />
      </FormLayout>
    </form>
  );
}
