"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthFormState } from "@/actions/auth";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";
import { t } from "@/i18n";

export function LoginForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signIn, {});
  const returnTo = useSearchParams().get("volver") ?? "/";

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="volver" value={returnTo} />
      <Field label={t.auth.username} htmlFor="username">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={state.values?.username}
        />
      </Field>
      <Field label={t.auth.password} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <SubmitButton fullWidth size="lg" className="mt-2">
        {t.auth.logIn}
      </SubmitButton>
    </form>
  );
}
