import { Download } from "lucide-react";
import { ButtonLink, Section } from "@/components/ui";
import { LoggedRaceReplay } from "@/components/race-log/LoggedRaceReplay";
import { getRaceLog } from "@/lib/data/race-logs";
import { carLabels } from "@/lib/race-log/log";
import { t } from "@/i18n";

/** Replay, lap chart and stats of a race logged round by round, with the downloads. Nothing until a round is closed. */
export async function RaceLogSection({ raceId }: { raceId: string }) {
  const saved = await getRaceLog(raceId);
  if (!saved || saved.log.rounds.length < 2) return null;
  const { log, names } = saved;
  const labels = carLabels(names);
  const cars = log.cars.map((c) => ({ id: c.userId, name: names[c.userId] ?? "?", label: labels[c.userId] ?? "?", color: c.color }));

  return (
    <Section
      title={t.raceLog.cardTitle}
      actions={
        <div className="flex gap-1">
          <ButtonLink href={`/carreras/${raceId}/registro.json`} variant="ghost" size="sm" title={t.raceLog.download}>
            <Download /> JSON
          </ButtonLink>
          <ButtonLink href={`/carreras/${raceId}/registro.csv`} variant="ghost" size="sm" title={t.raceLog.download}>
            <Download /> CSV
          </ButtonLink>
        </div>
      }
    >
      <LoggedRaceReplay track={log.track} laps={log.laps} cars={cars} rounds={log.rounds} />
    </Section>
  );
}
