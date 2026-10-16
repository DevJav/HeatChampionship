import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Map, Users } from "lucide-react";
import { ButtonLink, Container, EmptyState, Skeleton } from "@/components/ui";
import { getRaceLogEditorData } from "@/lib/data/race-logs";
import { hasTrackDrawing } from "@/lib/race-log/tracks";
import { raceLaps, raceTitle } from "@/lib/races";
import { requireAdmin } from "@/lib/session";
import { RaceLogSession } from "./RaceLogSession";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.raceLog.recordRace };

/**
 * Round-by-round race entry for the organiser, meant for a phone at the
 * table. Outside the admin panel so the recorder gets the whole screen.
 */
async function RecordRaceContent({ params }: PageProps<"/carreras/[id]/anotar">) {
  const { id } = await params;
  await requireAdmin(`/carreras/${id}/anotar`);
  const data = await getRaceLogEditorData(id);
  if (!data) notFound();
  const { race, drivers, carColors, log } = data;

  let body: React.ReactNode;
  if (!hasTrackDrawing(race.track.slug)) {
    body = <EmptyState icon={<Map />} title={t.raceLog.noDrawing} description={t.raceLog.noDrawingDescription} />;
  } else if (!log && drivers.length < 2) {
    body = (
      <EmptyState
        icon={<Users />}
        title={t.raceLog.notEnoughDrivers}
        description={t.raceLog.notEnoughDriversDescription}
        action={<ButtonLink href={`/admin/carreras/${race.id}`}>{t.raceLog.goToEntrants}</ButtonLink>}
      />
    );
  } else {
    body = (
      <RaceLogSession
        raceId={race.id}
        track={race.track.slug}
        laps={raceLaps(race) ?? undefined}
        drivers={drivers}
        carColors={carColors}
        savedLog={log}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Phones skip the heading so the recorder fits one screen */}
      <div className="flex flex-wrap items-center justify-between gap-3 max-lg:hidden">
        <div>
          <p className="font-display text-sm font-bold uppercase italic text-primary">{raceTitle(race)}</p>
          <h1 className="text-4xl">{t.raceLog.recordRace}</h1>
        </div>
        <ButtonLink href={`/carreras/${race.id}`} variant="ghost" size="sm">
          <ArrowLeft /> {t.raceLog.backToRace}
        </ButtonLink>
      </div>
      {body}
    </div>
  );
}

export default function RecordRacePage(props: PageProps<"/carreras/[id]/anotar">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RecordRaceContent {...props} />
      </Suspense>
    </Container>
  );
}
