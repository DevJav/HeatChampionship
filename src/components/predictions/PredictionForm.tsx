"use client";

import { startTransition, useActionState, useState } from "react";
import { Target } from "lucide-react";
import { savePrediction } from "@/actions/predictions";
import type { FormState } from "@/lib/forms";
import { Alert, Button, Field, Select } from "@/components/ui";
import { t } from "@/i18n";

const KEYS = ["first", "second", "third"] as const;

/** Three selects, one per podium place. */
export function PredictionForm({ raceId, drivers, current }: { raceId: string; drivers: { id: string; name: string }[]; current: string[] | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePrediction, {});
  const [picks, setPicks] = useState(() => current ?? ["", "", ""]);

  return (
    <form
      // Submitted by hand rather than with `action`, so React doesn't reset the selects afterwards
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="raceId" value={raceId} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        {KEYS.map((key, i) => (
          <Field key={key} label={t.predictions.places[i]} htmlFor={`prediction-${key}`}>
            <Select
              id={`prediction-${key}`}
              name={key}
              required
              value={picks[i]}
              onChange={(e) => setPicks((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
            >
              <option value="" disabled>
                {t.predictions.choose}
              </option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>
      <Button type="submit" size="sm" loading={pending} className="self-start">
        <Target /> {current ? t.predictions.update : t.predictions.save}
      </Button>
    </form>
  );
}
