import { Clock, Users } from "lucide-react";
import type { Entrant } from "@/lib/data/races";
import { formatShortDate } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { PlayerChip } from "@/components/domain/PlayerChip";

type EntryListProps = {
  entrants: Entrant[];
  maxPlayers: number;
  /** Rendered at the end of each row (e.g. admin remove button) */
  rowAction?: (entrant: Entrant) => React.ReactNode;
};

/** Confirmed drivers as a numbered grid, then the waitlist. */
export function EntryList({ entrants, maxPlayers, rowAction }: EntryListProps) {
  const confirmed = entrants.filter((e) => e.status === "CONFIRMED");
  const waitlist = entrants.filter((e) => e.status === "WAITLIST");

  if (entrants.length === 0) {
    return <EmptyState icon={<Users />} title="Aún no hay inscritos" className="py-8" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: maxPlayers }, (_, i) => {
          const entrant = confirmed[i];
          return (
            <li
              key={entrant?.id ?? `empty-${i}`}
              className="flex items-center gap-3 border-l-4 border-primary bg-surface-2 py-1.5 pr-2 pl-3"
            >
              <span className="w-6 font-display text-lg font-bold italic tabular-nums text-fg-muted">
                {i + 1}
              </span>
              {entrant ? (
                <>
                  <PlayerChip user={entrant.user} className="flex-1" />
                  {rowAction?.(entrant)}
                </>
              ) : (
                <span className="flex-1 text-sm text-fg-subtle italic">Plaza libre</span>
              )}
            </li>
          );
        })}
      </ol>

      {waitlist.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="flex items-center gap-2 text-lg">
            <Clock className="size-4" /> Lista de espera
          </h4>
          <ol className="flex flex-col gap-1">
            {waitlist.map((entrant, i) => (
              <li key={entrant.id} className="flex items-center gap-3 bg-surface-2/60 py-1.5 pr-2 pl-3">
                <span className="w-6 text-sm font-semibold text-fg-subtle tabular-nums">{i + 1}º</span>
                <PlayerChip user={entrant.user} className="flex-1" />
                <span className="text-xs text-fg-subtle">desde {formatShortDate(entrant.queuedAt)}</span>
                {rowAction?.(entrant)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
