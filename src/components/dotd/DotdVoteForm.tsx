"use client";

import { startTransition, useActionState, useState } from "react";
import { Check, Vote } from "lucide-react";
import { voteDriverOfTheDay } from "@/actions/driver-of-the-day";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/cn";
import { Alert, Button } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { t } from "@/i18n";

type Candidate = { id: string; name: string; color: string | null; position: number };

/** Pick one of the other drivers of the race, shown like the results: finishing place and name. */
export function DotdVoteForm({ raceId, candidates, current }: { raceId: string; candidates: Candidate[]; current: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(voteDriverOfTheDay, {});
  const [choice, setChoice] = useState(current);

  return (
    <form
      // Submitted by hand rather than with `action`, so React doesn't reset the choice afterwards
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="@container flex flex-col gap-3"
    >
      <input type="hidden" name="raceId" value={raceId} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <fieldset className="grid gap-2 @lg:grid-cols-2">
        <legend className="sr-only">{t.dotd.title}</legend>
        {candidates.map((c) => {
          const selected = choice === c.id;
          return (
            <label
              key={c.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 bg-surface-2 py-1.5 pr-3 pl-1.5 transition-colors hover:bg-border",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                selected && "bg-primary/10 ring-2 ring-primary hover:bg-primary/10",
              )}
            >
              <input
                type="radio"
                name="driverId"
                value={c.id}
                checked={selected}
                onChange={() => setChoice(c.id)}
                required
                className="sr-only"
              />
              <PositionBadge position={c.position} size="sm" />
              <DriverName name={c.name} color={c.color} link={false} className="flex-1" />
              <Check aria-hidden className={cn("size-5 shrink-0 text-primary", !selected && "invisible")} />
            </label>
          );
        })}
      </fieldset>
      <Button type="submit" size="sm" loading={pending} disabled={!choice || choice === current} className="self-start">
        <Vote /> {current ? t.dotd.changeVote : t.dotd.vote}
      </Button>
    </form>
  );
}
