"use client";

import { useActionState } from "react";
import { LogOut, UserPlus } from "lucide-react";
import { updateMyRegistration } from "@/actions/races";
import type { FormState } from "@/lib/forms";
import { Alert, ConfirmButton, SubmitButton } from "@/components/ui";

type SignupFormProps = {
  raceId: string;
  intent: "join" | "leave";
  /** Join button label, e.g. "Inscribirme" or "Apuntarme a la lista de espera" */
  label?: string;
  /** Warning shown in the confirmation dialog before leaving */
  leaveWarning?: string;
};

export function SignupForm({ raceId, intent, label, leaveWarning }: SignupFormProps) {
  const [state, action] = useActionState<FormState, FormData>(updateMyRegistration, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="raceId" value={raceId} />
      <input type="hidden" name="intent" value={intent} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {intent === "join" ? (
        <SubmitButton size="lg" fullWidth>
          <UserPlus /> {label ?? "Inscribirme"}
        </SubmitButton>
      ) : (
        <ConfirmButton
          variant="secondary"
          title="¿Retirarte de la carrera?"
          description={leaveWarning}
          confirmLabel="Sí, retirarme"
          className="w-full"
        >
          <LogOut /> Retirarme
        </ConfirmButton>
      )}
    </form>
  );
}
