import { Download } from "lucide-react";
import { ButtonLink, Section } from "@/components/ui";
import { LoggedRaceReplay } from "@/components/race-log/LoggedRaceReplay";
import { MomentOfTheRace } from "@/components/race-log/MomentOfTheRace";
import { getRaceLog } from "@/lib/data/race-logs";
import { momentOfTheRace } from "@/lib/race-log/highlights";
import { carLabels } from "@/lib/race-log/log";
import { trackDrawing } from "@/lib/race-log/tracks";
import { t } from "@/i18n";

/** Replay, lap chart and stats of a race logged round by round, with the downloads. Nothing until a round is closed. */
export async function RaceLogSection({ raceId }: { raceId: string }) {
  const saved = await getRaceLog(raceId);
  if (!saved || saved.log.rounds.length < 2) return null;
  const { log, names } = saved;
  const labels = carLabels(names);
  const cars = log.cars.map((c) => ({ id: c.userId, name: names[c.userId] ?? "?", label: labels[c.userId] ?? "?", color: c.color }));
  const layout = trackDrawing(log.track, log.laps)?.layout;
  const moment = layout && momentOfTheRace(layout, log.rounds);
  const star = moment && cars.find((c) => c.id === moment.userId);

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
      <div className="flex flex-col gap-4">
        {moment && star && <MomentOfTheRace moment={moment} name={star.name} color={star.color} />}
        <LoggedRaceReplay track={log.track} laps={log.laps} cars={cars} rounds={log.rounds} />
      </div>
    </Section>
  );
}
