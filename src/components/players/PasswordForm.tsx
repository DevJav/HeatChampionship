"use client";

import { useActionState } from "react";
import { changePassword } from "@/actions/profile";
import { FormLayout, TextField } from "@/components/forms/FormFields";
import { t } from "@/i18n";

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  return (
    <form action={action}>
      <FormLayout state={state} submitLabel={t.profile.changePassword}>
        <TextField
          name="currentPassword"
          label={t.profile.currentPassword}
          type="password"
          autoComplete="current-password"
          state={state}
          className="md:col-span-2"
        />
        <TextField name="newPassword" label={t.profile.newPassword} type="password" autoComplete="new-password" state={state} />
        <TextField name="confirm" label={t.profile.repeatNew} type="password" autoComplete="new-password" state={state} />
      </FormLayout>
    </form>
  );
}
