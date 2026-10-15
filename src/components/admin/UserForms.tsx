"use client";

import { useActionState } from "react";
import { CheckboxField, FormLayout, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";
import { t } from "@/i18n";

export function UserNameForm({ action, name }: { action: FormAction; name: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={t.admin.users.saveName}>
        <TextField name="name" label={t.admin.users.displayName} state={state} defaultValue={name} className="md:col-span-2" />
      </FormLayout>
    </form>
  );
}

export function UserPasswordForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={t.admin.users.changePassword}>
        <TextField
          name="newPassword"
          label={t.admin.users.newPassword}
          hint={t.admin.users.newPasswordHint}
          autoComplete="off"
          state={state}
          className="md:col-span-2"
        />
        <CheckboxField
          name="logout"
          label={t.admin.users.logOutSessions}
          state={state}
          defaultChecked
          className="md:col-span-2"
        />
      </FormLayout>
    </form>
  );
}
