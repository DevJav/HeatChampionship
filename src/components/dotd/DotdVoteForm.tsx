"use client";

import { useActionState } from "react";
import { Vote } from "lucide-react";
import { voteDriverOfTheDay } from "@/actions/driver-of-the-day";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/cn";
import { Alert, SubmitButton } from "@/components/ui";
import { t } from "@/i18n";

type Candidate = { id: string; name: string; color: string | null };

/** Pick one of the other drivers of the race. */
export function DotdVoteForm({ raceId, candidates, current }: { raceId: string; candidates: Candidate[]; current: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(voteDriverOfTheDay, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="raceId" value={raceId} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">{t.dotd.title}</legend>
        {candidates.map((c) => (
          <label
            key={c.id}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 border border-border bg-surface px-3 py-2 font-display font-bold uppercase italic",
              "has-[:checked]:border-primary has-[:checked]:bg-surface-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            )}
          >
            <input type="radio" name="driverId" value={c.id} defaultChecked={c.id === current} required className="sr-only" />
            <span aria-hidden className="h-4 w-1.5 shrink-0 ring-1 ring-fg/30" style={{ background: c.color ?? "var(--fg-subtle)" }} />
            {c.name}
          </label>
        ))}
      </fieldset>
      <SubmitButton size="sm" className="self-start">
        <Vote /> {current ? t.dotd.changeVote : t.dotd.vote}
      </SubmitButton>
    </form>
  );
}
