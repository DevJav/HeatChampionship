import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Flag, Pencil } from "lucide-react";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChequeredStrip,
  Container,
  Skeleton,
  SpeedStripes,
} from "@/components/ui";
import { FlagBackdrop } from "@/components/domain/CountryFlag";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { RaceArticles } from "@/components/articles/RaceArticles";
import { RaceUnlocks } from "@/components/achievements/RaceUnlocks";
import { getAchievements } from "@/lib/data/achievements";
import { EntryList } from "@/components/races/EntryList";
import { Podium } from "@/components/races/Podium";
import { RaceMeta } from "@/components/races/RaceMeta";
import { RacePhotos } from "@/components/races/RacePhotos";
import { RaceSignupPanel } from "@/components/races/RaceSignupPanel";
import { ResultsTable } from "@/components/races/ResultsTable";
import { CalendarButtons } from "@/components/races/CalendarButtons";
import { ShareButtons } from "@/components/races/ShareButtons";
import { TrackPreview } from "@/components/races/TrackPreview";
import { googleCalendarUrl } from "@/lib/calendar";
import { raceCalendarEvent, raceShareText, whatsappUrl } from "@/lib/race-share";
import { absoluteUrl } from "@/lib/site-url";
import { formatRaceDay } from "@/lib/format";
import { raceTitle } from "@/lib/races";
import { getRace, type RaceDetail } from "@/lib/data/races";
import { getRaceResults, type RaceResultDetail } from "@/lib/data/results";
import { racePhase } from "@/lib/registration-rules";
import { getCurrentUser, isAdmin } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/carreras/[id]">): Promise<Metadata> {
  const { id } = await params;
  const race = await getRace(id);
  if (!race) return { title: "Carrera" };
  const description = [formatRaceDay(race.scheduledAt), race.location, race.season.name].filter(Boolean).join(" · ");
  return { title: raceTitle(race), description, openGraph: { title: raceTitle(race), description } };
}

function RaceHero({ race, admin, results }: { race: RaceDetail; admin: boolean; results: RaceResultDetail[] }) {
  const url = absoluteUrl(`/carreras/${race.id}`);
  const phase = racePhase(race);
  const upcoming = phase === "UPCOMING" || phase === "OPEN" || phase === "CLOSED";
  const share = raceShareText(race, url, {
    confirmed: race.registrations.filter((r) => r.status === "CONFIRMED").length,
    podium: results.filter((r) => r.position <= 3).map((r) => r.user.name),
  });

  return (
    <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
      {race.track.countryCode ? (
        <FlagBackdrop
          code={race.track.countryCode}
          className="absolute inset-y-0 right-0 w-full opacity-45 sm:aspect-[2/1] sm:w-auto sm:max-w-full sm:opacity-60"
        />
      ) : (
        <SpeedStripes className="absolute inset-y-0 right-0 w-1/2 opacity-80" />
      )}
      <div className="relative flex flex-col items-start gap-3 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">Ronda {race.round}</Badge>
          <Badge tone="bar">{race.season.name}</Badge>
          <RaceStatusBadge race={race} />
        </div>
        <h1 className="text-5xl [text-shadow:0_2px_12px_rgb(0_0_0/0.5)] sm:text-7xl">{race.track.name}</h1>
        <RaceMeta race={race} className="text-bar-fg/80" />
        {race.status !== "DRAFT" && (
          <div className="flex flex-wrap gap-2">
            <ShareButtons whatsappHref={whatsappUrl(share)} url={url} />
            {upcoming && (
              <CalendarButtons
                icsHref={`/carreras/${race.id}/calendario`}
                googleHref={googleCalendarUrl(raceCalendarEvent(race, url))}
              />
            )}
          </div>
        )}
        {admin && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/admin/carreras/${race.id}`} variant="inverse" size="sm">
              <Pencil /> Editar
            </ButtonLink>
            <ButtonLink href={`/admin/carreras/${race.id}/resultados`} variant="inverse" size="sm">
              <Flag /> {race.status === "FINISHED" ? "Editar resultados" : "Resultados"}
            </ButtonLink>
          </div>
        )}
      </div>
      <ChequeredStrip className="relative text-bar-fg/80" />
    </section>
  );
}

function PhotosCard({ race, driverIds }: { race: RaceDetail; driverIds: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotos</CardTitle>
      </CardHeader>
      <CardBody>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <RacePhotos raceId={race.id} driverIds={driverIds} />
        </Suspense>
      </CardBody>
    </Card>
  );
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas</CardTitle>
      </CardHeader>
      <CardBody className="whitespace-pre-line text-sm text-fg-muted">{notes}</CardBody>
    </Card>
  );
}

async function FinishedRace({ race, results }: { race: RaceDetail; results: RaceResultDetail[] }) {
  const { unlocks, drivers } = await getAchievements();
  const driverIds = results.map((r) => r.user.id);
  const raceUnlocks = unlocks.filter((u) => u.race?.id === race.id);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Podio</CardTitle>
        </CardHeader>
        <CardBody className="pt-8">
          <Podium results={results} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Clasificación de la carrera</CardTitle>
        </CardHeader>
        <ResultsTable results={results} />
      </Card>
      {raceUnlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logros desbloqueados</CardTitle>
          </CardHeader>
          <CardBody>
            <RaceUnlocks unlocks={raceUnlocks} drivers={drivers} />
          </CardBody>
        </Card>
      )}
      {race.notes && <NotesCard notes={race.notes} />}
      <PhotosCard race={race} driverIds={driverIds} />
    </div>
  );
}

function UpcomingRace({ race }: { race: RaceDetail }) {
  const started = racePhase(race) === "AWAITING_RESULTS";
  const driverIds = race.registrations.map((r) => r.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Parrilla</CardTitle>
          </CardHeader>
          <CardBody>
            <EntryList entrants={race.registrations} maxPlayers={race.maxPlayers} />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inscripción</CardTitle>
            </CardHeader>
            <CardBody>
              <RaceSignupPanel race={race} />
            </CardBody>
          </Card>
          {race.notes && <NotesCard notes={race.notes} />}
        </div>
      </div>
      {/* Once the race is on, drivers can already share photos of the board */}
      {started && <PhotosCard race={race} driverIds={driverIds} />}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TrackPreview race={race} />
      </Suspense>
    </div>
  );
}

async function RaceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = isAdmin(await getCurrentUser());
  const race = await getRace(id, { includeDraft: admin });
  if (!race) notFound();
  const results = race.status === "FINISHED" ? await getRaceResults(race.id) : [];

  return (
    <div className="flex flex-col gap-8">
      {race.status === "DRAFT" && <Alert tone="warning">Borrador: solo lo ven los administradores.</Alert>}
      <RaceHero race={race} admin={admin} results={results} />
      <Suspense>
        <RaceArticles raceId={race.id} />
      </Suspense>
      {race.status === "FINISHED" ? <FinishedRace race={race} results={results} /> : <UpcomingRace race={race} />}
    </div>
  );
}

export default function RacePage({ params }: PageProps<"/carreras/[id]">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RaceView params={params} />
      </Suspense>
    </Container>
  );
}
