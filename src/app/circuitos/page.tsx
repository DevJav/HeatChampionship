import type { Metadata } from "next";
import { Suspense } from "react";
import { MapPinned } from "lucide-react";
import { Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { TrackCard } from "@/components/tracks/TrackCard";
import { listTracks } from "@/lib/data/catalog";
import { getStatsData } from "@/lib/data/stats";
import { trackStats } from "@/lib/stats";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.tracks.title };

async function TrackGrid() {
  const [tracks, { races, drivers }] = await Promise.all([listTracks(), getStatsData()]);
  const stats = new Map(trackStats(races).map((s) => [s.trackId, s]));
  // Tracks we've raced on, most races first (trackStats' order), then the rest still in the catalogue
  const order = [...stats.keys()];
  const raced = tracks.filter((track) => stats.has(track.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const shown = [...raced, ...tracks.filter((track) => track.active && !stats.has(track.id))];
  if (shown.length === 0) return <EmptyState icon={<MapPinned />} title={t.tracks.empty} />;

  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((track) => {
        const s = stats.get(track.id);
        return (
          <TrackCard
            key={track.id}
            track={track}
            races={s?.races ?? 0}
            lastWinner={s?.lastWinnerId ? (drivers.get(s.lastWinnerId)?.name ?? null) : null}
          />
        );
      })}
    </ol>
  );
}

export default function TracksPage() {
  return (
    <Container>
      <PageHeader title={t.tracks.title} description={t.tracks.description} />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TrackGrid />
      </Suspense>
    </Container>
  );
}
