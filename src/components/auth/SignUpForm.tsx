"use client";

import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/actions/auth";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

export function SignUpForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signUp, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field
        label="Usuario"
        htmlFor="username"
        hint="Para entrar. Minúsculas, números, punto y guion bajo."
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
        label="Nombre de piloto"
        htmlFor="name"
        hint="Así aparecerás en la clasificación."
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
      <Field label="Contraseña" htmlFor="password" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!errors.password}
        />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={errors.confirm}>
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
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
