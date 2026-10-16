"use client";

import { startTransition, useActionState, useState } from "react";
import { Radio } from "lucide-react";
import { saveRadio } from "@/actions/radio";
import type { FormState } from "@/lib/forms";
import { RADIO_MAX } from "@/lib/radio";
import { Alert, Button, Input } from "@/components/ui";
import { t } from "@/i18n";

/** The driver's own radio line: type, send; an empty line clears it. */
export function RadioForm({ raceId, current }: { raceId: string; current: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRadio, {});
  const [text, setText] = useState(current ?? "");

  return (
    <form
      // Submitted by hand rather than with `action`, so React doesn't reset the text afterwards
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="raceId" value={raceId} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <label htmlFor="radio-line" className="font-display text-sm font-bold uppercase tracking-wide text-fg-muted">
        {t.radio.yours}
      </label>
      <div className="flex gap-2">
        <Input
          id="radio-line"
          name="radio"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={RADIO_MAX}
          placeholder={t.radio.placeholder}
          className="flex-1"
        />
        <Button type="submit" size="sm" loading={pending} disabled={text.trim() === (current ?? "")} className="self-center">
          <Radio /> {t.radio.send}
        </Button>
      </div>
      <p className="text-xs text-fg-subtle" aria-live="polite">
        {state.message ?? `${text.length}/${RADIO_MAX}`}
      </p>
    </form>
  );
}
