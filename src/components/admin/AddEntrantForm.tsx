"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { Alert, Select, SubmitButton } from "@/components/ui";
import type { FormAction } from "./types";

type AddEntrantFormProps = {
  action: FormAction;
  players: { id: string; name: string }[];
};

/** Admin: sign a player up on their behalf. */
export function AddEntrantForm({ action, players }: AddEntrantFormProps) {
  const [state, formAction] = useActionState(action, {});

  if (players.length === 0) {
    return <p className="text-sm text-fg-muted">Todos los pilotos están inscritos.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="flex gap-2">
        <Select name="userId" aria-label="Piloto" defaultValue="">
          <option value="" disabled>
            Elige un piloto…
          </option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </Select>
        <SubmitButton variant="secondary">
          <UserPlus /> Añadir
        </SubmitButton>
      </div>
    </form>
  );
}
