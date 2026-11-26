"use client";

import { useActionState } from "react";
import { resetPassword } from "@/actions/password-reset";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { t } from "@/i18n";

/** Opened from the emailed link; `token` is the link's secret. */
export function NewPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword.bind(null, token), {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label={t.passwordReset.newPassword} htmlFor="newPassword" error={state.fieldErrors?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field label={t.passwordReset.repeatNew} htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton fullWidth size="lg" className="mt-2">
        {t.passwordReset.save}
      </SubmitButton>
    </form>
  );
}
