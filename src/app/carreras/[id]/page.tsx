import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarCheck, FileText, Flag, NotebookPen, Pencil } from "lucide-react";
import {
  Alert,
  Badge,
  ButtonLink,
  buttonVariants,
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
import { DriverOfTheDayCard } from "@/components/dotd/DriverOfTheDayCard";
import { RacePredictions } from "@/components/predictions/RacePredictions";
import { TeamRadio } from "@/components/radio/TeamRadio";
import { RaceChancesCard } from "@/components/chances/RaceChancesCard";
import { getAchievements } from "@/lib/data/achievements";
import { EntryList } from "@/components/races/EntryList";
import { Podium } from "@/components/races/Podium";
import { RaceMeta } from "@/components/races/RaceMeta";
import { RacePhotos } from "@/components/races/RacePhotos";
import { RaceSignupPanel } from "@/components/races/RaceSignupPanel";
import { RaceLogSection } from "@/components/races/RaceLogSection";
import { ResultsTable } from "@/components/races/ResultsTable";
import { CalendarButtons } from "@/components/races/CalendarButtons";
import { ShareButtons } from "@/components/races/ShareButtons";
import { TrackPreview } from "@/components/races/TrackPreview";
import { googleCalendarUrl } from "@/lib/calendar";
import { raceCalendarEvent, raceShareText, whatsappUrl } from "@/lib/race-share";
import { absoluteUrl } from "@/lib/site-url";
import { formatRaceDate } from "@/lib/format";
import { hasTrackDrawing } from "@/lib/race-log/tracks";
import { raceTitle } from "@/lib/races";
import { getRace, type RaceDetail } from "@/lib/data/races";
import { getRaceResults, type RaceResultDetail } from "@/lib/data/results";
import { racePhase } from "@/lib/registration-rules";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { t } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/carreras/[id]">): Promise<Metadata> {
  const { id } = await params;
  const race = await getRace(id);
  if (!race) return { title: t.races.fallbackTitle };
  const description = [formatRaceDate(race), race.location, race.season.name].filter(Boolean).join(" · ");
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
          <Badge tone="primary">{t.common.round(race.round)}</Badge>
          <Badge tone="bar">{race.season.name}</Badge>
          <RaceStatusBadge race={race} />
        </div>
        <h1 className="text-5xl [text-shadow:0_2px_12px_rgb(0_0_0/0.5)] sm:text-7xl">{race.track.name}</h1>
        <RaceMeta race={race} className="text-bar-fg/80" />
        {race.status !== "DRAFT" && (
          <div className="flex flex-wrap gap-2">
            <ShareButtons whatsappHref={whatsappUrl(share)} url={url} />
            {upcoming && race.dateTbd && (
              <ButtonLink href="/carreras/fecha" variant="inverse" size="sm">
                <CalendarCheck /> {t.datePoll.link}
              </ButtonLink>
            )}
            {upcoming && !race.dateTbd && (
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
              <Pencil /> {t.common.edit}
            </ButtonLink>
            {hasTrackDrawing(race.track.slug) && (
              <ButtonLink href={`/carreras/${race.id}/anotar`} variant="inverse" size="sm">
                <NotebookPen /> {t.raceLog.recordRace}
              </ButtonLink>
            )}
            <ButtonLink href={`/admin/carreras/${race.id}/resultados`} variant="inverse" size="sm">
              <Flag /> {race.status === "FINISHED" ? t.races.editResults : t.races.results}
            </ButtonLink>
            <a href={`/carreras/${race.id}/cronica.md`} title={t.raceLog.dossierTitle} className={buttonVariants({ variant: "inverse", size: "sm" })}>
              <FileText /> {t.raceLog.dossier}
            </a>
          </div>
        )}
      </div>
      <ChequeredStrip className="relative text-bar-fg/80" />
    </section>
  );
}

function PhotosCard({ race, driverIds }: { race: RaceDetail; driverIds: string[] }) {
  return (
    <Card id="fotos" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{t.races.photos}</CardTitle>
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
        <CardTitle>{t.races.notes}</CardTitle>
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
          <CardTitle>{t.races.podium}</CardTitle>
        </CardHeader>
        <CardBody className="pt-8">
          <Podium results={results} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.races.raceResults}</CardTitle>
        </CardHeader>
        <ResultsTable results={results} />
      </Card>
      <Suspense>
        <TeamRadio raceId={race.id} results={results} />
      </Suspense>
      <Suspense>
        <DriverOfTheDayCard race={race} results={results} />
      </Suspense>
      <Suspense>
        <RacePredictions race={race} results={results} />
      </Suspense>
      {raceUnlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.races.achievementsUnlocked}</CardTitle>
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
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.races.grid}</CardTitle>
            </CardHeader>
            <CardBody>
              <EntryList entrants={race.registrations} maxPlayers={race.maxPlayers} />
            </CardBody>
          </Card>
          {!started && (
            <Suspense>
              <RaceChancesCard race={race} />
            </Suspense>
          )}
          <Suspense>
            <RacePredictions race={race} />
          </Suspense>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.races.signup}</CardTitle>
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
      {race.status === "DRAFT" && <Alert tone="warning">{t.races.draftNotice}</Alert>}
      <RaceHero race={race} admin={admin} results={results} />
      <Suspense>
        <RaceArticles raceId={race.id} />
      </Suspense>
      {race.status === "FINISHED" ? <FinishedRace race={race} results={results} /> : <UpcomingRace race={race} />}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RaceLogSection raceId={race.id} title={raceTitle(race)} />
      </Suspense>
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
