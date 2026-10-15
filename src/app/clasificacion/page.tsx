import type { Metadata } from "next";
import { Suspense } from "react";
import { Crown, Flag, Trophy } from "lucide-react";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from "@/components/ui";
import { SeasonPodium } from "@/components/achievements/SeasonPodium";
import { SeasonPicker } from "@/components/standings/SeasonPicker";
import { StandingsChart } from "@/components/standings/StandingsChart";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { getCurrentSeason, listSeasons } from "@/lib/data/catalog";
import { getSeasonStandings } from "@/lib/data/standings";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.standings.title };

async function StandingsView({ searchParams }: { searchParams: PageProps<"/clasificacion">["searchParams"] }) {
  const { temporada } = await searchParams;
  const [seasons, current] = await Promise.all([listSeasons(), getCurrentSeason()]);
  const season = seasons.find((s) => s.id === temporada) ?? current;

  if (!season) {
    return (
      <>
        <PageHeader title={t.standings.title} />
        <EmptyState icon={<Trophy />} title={t.standings.noSeasons} />
      </>
    );
  }

  const standings = await getSeasonStandings(season.id);
  const finished = season.status === "FINISHED";
  const { rows, races, drivers, scheduledRaces } = standings;
  const leader = rows[0] ? drivers.get(rows[0].userId) : null;
  const topWins = Math.max(...rows.map((r) => r.wins));
  const winLeaders = rows.filter((r) => r.wins === topWins).map((r) => drivers.get(r.userId)?.name ?? "—");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={season.name}
        title={t.standings.title}
        description={t.standings.description}
        className="pb-0"
      />
      <SeasonPicker seasons={seasons} selectedId={season.id} basePath="/clasificacion" />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Flag />}
          title={t.standings.noResults}
          description={t.standings.noResultsDescription}
        />
      ) : (
        <>
          {finished && <SeasonPodium places={rows.slice(0, 5)} drivers={drivers} />}

          {/* A finished season shows its champion on the podium above instead of a leader card */}
          <div className={cn("grid grid-cols-2 gap-4", !finished && "lg:grid-cols-3")}>
            {!finished && (
              <StatCard
                label={t.standings.leader}
                value={leader?.name ?? "—"}
                hint={`${rows[0].points} ${t.common.pts}${rows[1] ? ` · ${t.standings.leadOverSecond(rows[0].points - rows[1].points)}` : ""}`}
                icon={<Crown />}
              />
            )}
            <StatCard
              label={t.standings.racesRun}
              value={`${races.length}/${Math.max(scheduledRaces, races.length)}`}
              icon={<Flag />}
            />
            <StatCard
              label={t.standings.mostWins}
              value={topWins}
              hint={
                topWins === 0
                  ? undefined
                  : winLeaders.length > 3
                    ? t.common.namesAndMore(winLeaders.slice(0, 3), winLeaders.length - 3)
                    : winLeaders.join(", ")
              }
              icon={<Trophy />}
              className="max-lg:col-span-2"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.standings.drivers}</CardTitle>
            </CardHeader>
            <StandingsTable standings={standings} />
          </Card>

          {races.length >= 2 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t.standings.progression}</CardTitle>
                  <CardDescription>{t.standings.progressionDescription}</CardDescription>
                </div>
              </CardHeader>
              <CardBody>
                <StandingsChart standings={standings} />
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function StandingsPage({ searchParams }: PageProps<"/clasificacion">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <StandingsView searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
