"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthFormState } from "@/actions/auth";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";
import { t } from "@/i18n";

/** `canRecover`: emails are on, so "Forgot your password?" can send a link. */
export function LoginForm({ canRecover }: { canRecover: boolean }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signIn, {});
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("volver") ?? "/";
  // Back from /recuperar/nueva
  const passwordChanged = searchParams.get("clave") === "nueva";

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : (
        passwordChanged && <Alert tone="success">{t.passwordReset.changed}</Alert>
      )}
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
      {canRecover && (
        <Link href="/recuperar" className="-mt-2 self-end text-sm font-semibold text-primary hover:underline">
          {t.passwordReset.forgot}
        </Link>
      )}
      <SubmitButton fullWidth size="lg" className="mt-2">
        {t.auth.logIn}
      </SubmitButton>
    </form>
  );
}
