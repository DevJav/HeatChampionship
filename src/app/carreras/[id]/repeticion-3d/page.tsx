import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { ButtonLink, Container, Skeleton } from "@/components/ui";
import { Replay3D } from "@/components/race-log/replay3d/Replay3D";
import { getRaceLog } from "@/lib/data/race-logs";
import { getRace } from "@/lib/data/races";
import { getRaceResults } from "@/lib/data/results";
import { hasTrackDrawing } from "@/lib/race-log/tracks";
import { raceTitle } from "@/lib/races";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.raceLog.replay3d.title };

/**
 * The race log replayed as a 3D race, apart from the race page so three.js
 * only loads for those who open it.
 */
async function Replay3DContent({ params, searchParams }: PageProps<"/carreras/[id]/repeticion-3d">) {
  const { id } = await params;
  // ?debug draws the imaginary lanes the cars move between
  const debug = "debug" in (await searchParams);
  const [race, saved, results] = await Promise.all([getRace(id), getRaceLog(id), getRaceResults(id)]);
  if (!race || !saved || saved.log.rounds.length < 2 || !hasTrackDrawing(saved.log.track)) notFound();

  const { log, names } = saved;
  const cars = log.cars.map((c) => ({ id: c.userId, name: names[c.userId] ?? "?", color: c.color }));
  const radio = Object.fromEntries(results.filter((r) => r.radio).map((r) => [r.user.id, r.radio!]));
  const title = raceTitle(race);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold uppercase italic text-primary">{title}</p>
          <h1 className="text-4xl">{t.raceLog.replay3d.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">{t.raceLog.replay3d.description}</p>
        </div>
        <ButtonLink href={`/carreras/${race.id}`} variant="ghost" size="sm">
          <ArrowLeft /> {t.raceLog.backToRace}
        </ButtonLink>
      </div>
      <Replay3D raceId={race.id} track={log.track} laps={log.laps} cars={cars} rounds={log.rounds} title={title} radio={radio} debug={debug} />
    </div>
  );
}

export default function Replay3DPage(props: PageProps<"/carreras/[id]/repeticion-3d">) {
  return (
    // Full width: the guion's timeline needs the room
    <Container className="max-w-none">
      <Suspense fallback={<Skeleton className="aspect-video w-full" />}>
        <Replay3DContent {...props} />
      </Suspense>
    </Container>
  );
}
