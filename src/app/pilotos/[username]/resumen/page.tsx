import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { ButtonLink, Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { SeasonPicker } from "@/components/standings/SeasonPicker";
import { WrappedSlides } from "@/components/wrapped/WrappedSlides";
import { getAchievements } from "@/lib/data/achievements";
import { listSeasons } from "@/lib/data/catalog";
import { getPlayerProfile } from "@/lib/data/players";
import { getSeasonStandings } from "@/lib/data/standings";
import { getStatsData } from "@/lib/data/stats";
import { seasonWrapped } from "@/lib/wrapped";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.wrapped.link };

async function WrappedView({ params, searchParams }: PageProps<"/pilotos/[username]/resumen">) {
  const [{ username }, { temporada }] = await Promise.all([params, searchParams]);
  const player = await getPlayerProfile(decodeURIComponent(username));
  if (!player) notFound();

  // Seasons they raced, newest first (results come newest first)
  const raced = [...new Map(player.results.map((r) => [r.race.season.id, r.race.season])).values()];
  const back = (
    <ButtonLink href={`/pilotos/${player.username}`} variant="ghost" size="sm" className="self-start">
      <ArrowLeft /> {player.name}
    </ButtonLink>
  );
  if (raced.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState title={t.wrapped.title(player.name)} description={t.wrapped.none} />
      </div>
    );
  }

  const season = raced.find((s) => s.id === temporada) ?? raced[0];
  const [{ races, drivers }, standings, { unlocks }, seasons] = await Promise.all([
    getStatsData({ seasonId: season.id }),
    getSeasonStandings(season.id),
    getAchievements(),
    listSeasons(),
  ]);
  const finished = seasons.find((s) => s.id === season.id)?.status === "FINISHED";
  const wrapped = seasonWrapped(player.id, races, standings.rows, unlocks, season.id);
  if (!wrapped) notFound();

  return (
    <div className="flex flex-col gap-6">
      {back}
      <PageHeader eyebrow={season.name} title={t.wrapped.title(player.name)} description={finished ? undefined : t.wrapped.inProgress} className="pb-0" />
      <SeasonPicker seasons={raced} selectedId={season.id} basePath={`/pilotos/${player.username}/resumen`} />
      <WrappedSlides wrapped={wrapped} drivers={drivers} finished={finished} />
    </div>
  );
}

export default function WrappedPage(props: PageProps<"/pilotos/[username]/resumen">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <WrappedView {...props} />
      </Suspense>
    </Container>
  );
}
