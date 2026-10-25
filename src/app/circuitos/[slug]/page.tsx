import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, ChequeredStrip, Container, Section, Skeleton, SpeedStripes } from "@/components/ui";
import { FlagBackdrop } from "@/components/domain/CountryFlag";
import { RaceRow } from "@/components/races/RaceRow";
import { TrackDriversTable, TrackHistoryCard, TrackStatCards } from "@/components/tracks/TrackRecords";
import { countryName } from "@/lib/countries";
import { getTrackBySlug } from "@/lib/data/catalog";
import { listUpcomingRacesAt } from "@/lib/data/races";
import { getStatsData } from "@/lib/data/stats";
import { entrantRecords } from "@/lib/stats";
import { t } from "@/i18n";

type Track = NonNullable<Awaited<ReturnType<typeof getTrackBySlug>>>;

export async function generateMetadata({ params }: PageProps<"/circuitos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) return { title: t.tracks.fallbackTitle };
  return { title: track.name, description: track.description ?? undefined };
}

function TrackHero({ track }: { track: Track }) {
  const country = countryName(track.countryCode);
  return (
    <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
      {track.countryCode ? (
        <FlagBackdrop
          code={track.countryCode}
          className="absolute inset-y-0 right-0 w-full opacity-45 sm:aspect-[2/1] sm:w-auto sm:max-w-full sm:opacity-60"
        />
      ) : (
        <SpeedStripes className="absolute inset-y-0 right-0 w-1/2 opacity-80" />
      )}
      <div className="relative flex flex-col items-start gap-3 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{t.tracks.fallbackTitle}</Badge>
          {country && country !== track.name && <Badge tone="bar">{country}</Badge>}
          {track.expansion && <Badge tone="bar">{track.expansion}</Badge>}
          {track.defaultLaps && <Badge tone="bar">{t.common.laps(track.defaultLaps)}</Badge>}
        </div>
        <h1 className="text-5xl [text-shadow:0_2px_12px_rgb(0_0_0/0.5)] sm:text-7xl">{track.name}</h1>
        {track.description && <p className="max-w-2xl whitespace-pre-line text-bar-fg/80">{track.description}</p>}
      </div>
      <ChequeredStrip className="relative text-bar-fg/80" />
    </section>
  );
}

async function TrackRecords({ track }: { track: Track }) {
  const [{ races, drivers }, upcoming] = await Promise.all([getStatsData({ trackId: track.id }), listUpcomingRacesAt(track.id)]);
  const nameOf = (userId: string) => drivers.get(userId)?.name ?? "—";
  const rows = entrantRecords(races, [...drivers.keys()]);

  return (
    <>
      {upcoming.length > 0 && (
        <Section title={t.tracks.upcoming}>
          <ol className="flex flex-col gap-3">
            {upcoming.map((race) => (
              <RaceRow key={race.id} race={race} />
            ))}
          </ol>
        </Section>
      )}

      <TrackStatCards races={races} nameOf={nameOf} />

      {races.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <TrackDriversTable
            className="lg:col-span-2"
            title={t.tracks.drivers}
            description={t.tracks.driversDescription(track.name)}
            rows={rows}
            driverOf={(userId) => {
              const driver = drivers.get(userId);
              return { name: driver?.name ?? "—", username: driver?.username, color: driver?.favoriteColor?.hex };
            }}
          />
          <TrackHistoryCard races={races} drivers={drivers} nameOf={nameOf} />
        </div>
      )}
    </>
  );
}

async function TrackView({ params }: { params: PageProps<"/circuitos/[slug]">["params"] }) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) notFound();

  return (
    <div className="flex flex-col gap-8">
      <TrackHero track={track} />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TrackRecords track={track} />
      </Suspense>
    </div>
  );
}

export default function TrackPage({ params }: PageProps<"/circuitos/[slug]">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TrackView params={params} />
      </Suspense>
    </Container>
  );
}
