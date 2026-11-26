"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/actions/password-reset";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { t } from "@/i18n";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Field label={t.auth.username} htmlFor="username" error={state.fieldErrors?.username}>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={state.values?.username}
        />
      </Field>
      <SubmitButton fullWidth size="lg" className="mt-2">
        {t.passwordReset.submit}
      </SubmitButton>
      <p className="text-sm text-fg-muted">{t.passwordReset.noEmail}</p>
    </form>
  );
}
