import { Radio } from "lucide-react";
import type { RaceResultDetail } from "@/lib/data/results";
import { getCurrentUser } from "@/lib/session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { RadioForm } from "./RadioForm";
import { t } from "@/i18n";

/** The drivers' radio lines about a finished race, and the box to write your own. Reads the session. */
export async function TeamRadio({ raceId, results }: { raceId: string; results: RaceResultDetail[] }) {
  const user = await getCurrentUser();
  const mine = user && results.find((r) => r.user.id === user.id);
  const lines = results.filter((r) => r.radio);
  if (lines.length === 0 && !mine) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.radio.title}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        {lines.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {lines.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                {/* Broadcast radio caption: team-colour bar with the name, then the line */}
                <span className="flex shrink-0 items-center gap-2 surface-bar py-1 pr-2 pl-1 sm:w-52">
                  <span aria-hidden className="h-5 w-1.5 shrink-0 ring-1 ring-white/40" style={{ background: r.carColor?.hex ?? r.user.favoriteColor?.hex ?? "var(--fg-subtle)" }} />
                  <Radio aria-hidden className="size-3.5 shrink-0 opacity-70" />
                  {/* pr-1 keeps the italic last letter clear of the truncation edge */}
                  <span title={r.user.name} className="truncate pr-1 font-display text-sm font-bold uppercase italic">
                    {r.user.name}
                  </span>
                </span>
                <q className="text-lg italic">{r.radio}</q>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">{t.radio.empty}</p>
        )}
        {mine && <RadioForm raceId={raceId} current={mine.radio} />}
      </CardBody>
    </Card>
  );
}
