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
import { SeasonPicker } from "@/components/standings/SeasonPicker";
import { StandingsChart } from "@/components/standings/StandingsChart";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { getCurrentSeason, listSeasons } from "@/lib/data/catalog";
import { getSeasonStandings } from "@/lib/data/standings";

export const metadata: Metadata = { title: "Clasificación" };

async function StandingsView({ searchParams }: { searchParams: PageProps<"/clasificacion">["searchParams"] }) {
  const { temporada } = await searchParams;
  const [seasons, current] = await Promise.all([listSeasons(), getCurrentSeason()]);
  const season = seasons.find((s) => s.id === temporada) ?? current;

  if (!season) {
    return (
      <>
        <PageHeader title="Clasificación" />
        <EmptyState icon={<Trophy />} title="Todavía no hay temporadas" />
      </>
    );
  }

  const standings = await getSeasonStandings(season.id);
  const { rows, races, drivers, scheduledRaces } = standings;
  const leader = rows[0] ? drivers.get(rows[0].userId) : null;
  const topWins = Math.max(...rows.map((r) => r.wins));
  const winLeaders = rows.filter((r) => r.wins === topWins).map((r) => drivers.get(r.userId)?.name ?? "—");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={season.name}
        title="Clasificación"
        description="Puntos por carrera, desempate por número de victorias, segundos puestos…"
        className="pb-0"
      />
      <SeasonPicker seasons={seasons} selectedId={season.id} basePath="/clasificacion" />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Flag />}
          title="Aún no hay resultados"
          description="La clasificación aparecerá cuando termine la primera carrera de la temporada."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Líder"
              value={leader?.name ?? "—"}
              hint={`${rows[0].points} pts${rows[1] ? ` · +${rows[0].points - rows[1].points} sobre el 2º` : ""}`}
              icon={<Crown />}
            />
            <StatCard
              label="Carreras disputadas"
              value={`${races.length}/${Math.max(scheduledRaces, races.length)}`}
              icon={<Flag />}
            />
            <StatCard
              label="Más victorias"
              value={topWins}
              hint={
                topWins === 0
                  ? undefined
                  : winLeaders.length > 3
                    ? `${winLeaders.slice(0, 3).join(", ")} y ${winLeaders.length - 3} más`
                    : winLeaders.join(", ")
              }
              icon={<Trophy />}
              className="max-lg:col-span-2"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pilotos</CardTitle>
            </CardHeader>
            <StandingsTable standings={standings} />
          </Card>

          {races.length >= 2 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Evolución</CardTitle>
                  <CardDescription>Puntos acumulados tras cada ronda. Pasa el ratón para ver a todos.</CardDescription>
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
