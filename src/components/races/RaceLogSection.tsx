import { Download } from "lucide-react";
import { ButtonLink, Section } from "@/components/ui";
import { LoggedRaceReplay } from "@/components/race-log/LoggedRaceReplay";
import { MomentOfTheRace, RivalryOfTheRace } from "@/components/race-log/RaceHighlights";
import { ReplayVideoButton } from "@/components/race-log/ReplayVideoButton";
import { getRaceLog } from "@/lib/data/race-logs";
import { momentOfTheRace, pairDuels, rivalryOfTheRace } from "@/lib/race-log/highlights";
import { carLabels } from "@/lib/race-log/log";
import { trackDrawing } from "@/lib/race-log/tracks";
import { t } from "@/i18n";

/** Replay, lap chart and stats of a race logged round by round, with the downloads. Nothing until a round is closed. */
export async function RaceLogSection({ raceId, title }: { raceId: string; title: string }) {
  const saved = await getRaceLog(raceId);
  if (!saved || saved.log.rounds.length < 2) return null;
  const { log, names } = saved;
  const labels = carLabels(names);
  const cars = log.cars.map((c) => ({ id: c.userId, name: names[c.userId] ?? "?", label: labels[c.userId] ?? "?", color: c.color }));
  const layout = trackDrawing(log.track, log.laps)?.layout;
  const moment = layout && momentOfTheRace(layout, log.rounds);
  const rivalry = layout && rivalryOfTheRace(pairDuels(layout, log.rounds));
  const car = (id: string) => cars.find((c) => c.id === id);
  const star = moment && car(moment.userId);
  const rivals = rivalry && { a: car(rivalry.a), b: car(rivalry.b) };

  return (
    <Section
      title={t.raceLog.cardTitle}
      actions={
        <div className="flex flex-wrap gap-1">
          <ReplayVideoButton track={log.track} laps={log.laps} cars={cars} rounds={log.rounds} title={title} />
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
        {(star || rivals) && (
          <div className="grid gap-4 md:grid-cols-2">
            {moment && star && <MomentOfTheRace moment={moment} car={star} />}
            {rivalry && rivals?.a && rivals.b && <RivalryOfTheRace rivalry={rivalry} a={rivals.a} b={rivals.b} />}
          </div>
        )}
        <LoggedRaceReplay track={log.track} laps={log.laps} cars={cars} rounds={log.rounds} />
      </div>
    </Section>
  );
}
