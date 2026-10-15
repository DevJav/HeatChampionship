"use client";

import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/actions/auth";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";
import { t } from "@/i18n";

export function SignUpForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signUp, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field
        label={t.auth.username}
        htmlFor="username"
        hint={t.auth.usernameHint}
        error={errors.username}
      >
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={state.values?.username}
          aria-invalid={!!errors.username}
        />
      </Field>
      <Field
        label={t.auth.driverName}
        htmlFor="name"
        hint={t.auth.driverNameHint}
        error={errors.name}
      >
        <Input
          id="name"
          name="name"
          autoComplete="nickname"
          required
          defaultValue={state.values?.name}
          aria-invalid={!!errors.name}
        />
      </Field>
      <Field label={t.auth.password} htmlFor="password" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!errors.password}
        />
      </Field>
      <Field label={t.auth.confirmPassword} htmlFor="confirm" error={errors.confirm}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!errors.confirm}
        />
      </Field>
      <SubmitButton fullWidth size="lg" className="mt-2">
        {t.auth.createAccount}
      </SubmitButton>
    </form>
  );
}
