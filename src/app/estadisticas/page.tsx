import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartColumn, Flag, Flame, Gauge, Medal, Rocket, Star, Trophy, TrendingUp, Users, Award } from "lucide-react";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  EmptyState,
  PageHeader,
  Section,
  Skeleton,
  StatCard,
} from "@/components/ui";
import { CarColorChip } from "@/components/domain/CarColorChip";
import { SeasonPicker } from "@/components/standings/SeasonPicker";
import { DriverStatsTable } from "@/components/stats/DriverStatsTable";
import { GridChart } from "@/components/stats/GridChart";
import { HeadToHeadMatrix } from "@/components/stats/HeadToHeadMatrix";
import { RecordCard } from "@/components/stats/RecordCard";
import { TallyTable } from "@/components/stats/TallyTable";
import { TrackStatsTable } from "@/components/stats/TrackStatsTable";
import { listSeasons } from "@/lib/data/catalog";
import { getStatsData } from "@/lib/data/stats";
import { formatDecimal } from "@/lib/format";
import {
  carColorStats,
  championshipRecords,
  driverCodes,
  driverStats,
  gridStats,
  headToHead,
  trackStats,
  upgradeStats,
} from "@/lib/stats";

export const metadata: Metadata = { title: "Estadísticas" };

const ALL_SEASONS = "Histórico";

function BlockHeader({ title, description }: { title: string; description?: string }) {
  return (
    <CardHeader>
      <div>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
    </CardHeader>
  );
}

async function StatsView({ searchParams }: { searchParams: PageProps<"/estadisticas">["searchParams"] }) {
  const { temporada } = await searchParams;
  const seasons = await listSeasons();
  const season = seasons.find((s) => s.id === temporada) ?? null;
  const { races, drivers } = await getStatsData({ seasonId: season?.id });

  const header = (
    <>
      <PageHeader
        eyebrow={season?.name ?? ALL_SEASONS}
        title="Estadísticas"
        description="Récords, cara a cara, parrilla, circuitos, coches y mejoras."
        className="pb-0"
      />
      <SeasonPicker
        seasons={seasons}
        selectedId={season?.id ?? null}
        basePath="/estadisticas"
        allSeasonsLabel={ALL_SEASONS}
      />
    </>
  );

  if (races.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState
          icon={<ChartColumn />}
          title="Aún no hay resultados"
          description="Las estadísticas aparecerán cuando termine la primera carrera."
        />
      </div>
    );
  }

  const driverRows = driverStats(races);
  const records = championshipRecords(races);
  const codes = driverCodes(driverRows.map((row) => ({ id: row.userId, name: drivers.get(row.userId)?.name ?? "?" })));
  const duels = headToHead(races);
  const grid = gridStats(races);
  const colors = carColorStats(races);
  const upgrades = upgradeStats(races);
  const winners = new Set(races.flatMap((race) => race.results.filter((r) => r.position === 1).map((r) => r.userId)));
  const averageField = races.reduce((sum, race) => sum + race.results.length, 0) / races.length;
  const recordProps = { drivers, showSeason: !season };

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Carreras" value={races.length} icon={<Flag />} />
        <StatCard label="Pilotos" value={driverRows.length} icon={<Users />} />
        <StatCard label="Ganadores distintos" value={winners.size} icon={<Trophy />} />
        <StatCard label="Pilotos por carrera" value={formatDecimal(averageField)} icon={<Gauge />} />
      </div>

      <Section title="Récords">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RecordCard label="Más victorias" icon={<Trophy />} record={records.mostWins} {...recordProps} />
          <RecordCard label="Más podios" icon={<Medal />} record={records.mostPodiums} {...recordProps} />
          <RecordCard label="Más puntos" icon={<Star />} record={records.mostPoints} {...recordProps} />
          <RecordCard
            label="Racha de victorias"
            icon={<Flame />}
            record={records.winStreak}
            caption="seguidas"
            {...recordProps}
          />
          <RecordCard
            label="Racha de podios"
            icon={<Award />}
            record={records.podiumStreak}
            caption="seguidos"
            {...recordProps}
          />
          <RecordCard
            label="Mejor llegada media"
            icon={<Gauge />}
            record={records.bestAverageFinish}
            format={formatDecimal}
            caption={`mín. ${records.minStarts} carreras`}
            {...recordProps}
          />
          <RecordCard
            label="Mayor remontada"
            icon={<TrendingUp />}
            record={records.biggestComeback}
            format={(v) => `+${v}`}
            caption="posiciones"
            {...recordProps}
          />
          <RecordCard
            label="Victoria desde más atrás"
            icon={<Rocket />}
            record={records.winFromFurthestBack}
            format={(v) => `${v}º`}
            caption="en parrilla"
            {...recordProps}
          />
          <RecordCard label="Más carreras" icon={<Flag />} record={records.mostStarts} {...recordProps} />
        </div>
        <p className="text-xs text-fg-muted">Las rachas cuentan carreras disputadas seguidas: faltar a una no la corta.</p>
      </Section>

      <Card>
        <BlockHeader title="Pilotos" description="Ordenados por puntos por carrera." />
        <DriverStatsTable rows={driverRows} drivers={drivers} />
      </Card>

      {driverRows.length >= 2 && (
        <Card>
          <BlockHeader
            title="Cara a cara"
            description="Carreras en las que el piloto de la fila acabó por delante – por detrás del de la columna."
          />
          <CardBody>
            <HeadToHeadMatrix
              drivers={driverRows.map((row) => {
                const driver = drivers.get(row.userId);
                return {
                  id: row.userId,
                  name: driver?.name ?? "—",
                  username: driver?.username ?? null,
                  color: driver?.favoriteColor?.hex ?? null,
                  code: codes.get(row.userId)!,
                };
              })}
              duels={Object.fromEntries([...duels].map(([id, row]) => [id, Object.fromEntries(row)]))}
            />
          </CardBody>
        </Card>
      )}

      {grid.length > 0 && (
        <Card>
          <BlockHeader title="Parrilla" description="Porcentaje de victorias según la posición de salida." />
          <CardBody className="flex flex-col gap-4">
            <GridChart slots={grid} />
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-fg-muted hover:text-primary">
                Ver como tabla
              </summary>
              <div className="mt-3">
                <TallyTable
                  labelHeader="Salida"
                  usesHeader="Salidas"
                  rows={grid.map((slot) => ({ key: slot.startPosition, label: `${slot.startPosition}º`, tally: slot }))}
                />
              </div>
            </details>
          </CardBody>
        </Card>
      )}

      <Card>
        <BlockHeader title="Circuitos" />
        <TrackStatsTable rows={trackStats(races)} drivers={drivers} />
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <BlockHeader title="Coches" description="Resultados según el color del coche." />
          {colors.length > 0 ? (
            <TallyTable
              labelHeader="Color"
              rows={colors.map(({ color, ...tally }) => ({
                key: color.id,
                label: <CarColorChip name={color.name} hex={color.hex} />,
                tally,
              }))}
            />
          ) : (
            <CardBody>
              <p className="text-sm text-fg-muted">No se han anotado colores de coche.</p>
            </CardBody>
          )}
        </Card>

        <Card>
          <BlockHeader title="Mejoras" description="Resultados de quien llevaba cada mejora." />
          {upgrades.length > 0 ? (
            <TallyTable
              labelHeader="Mejora"
              rows={upgrades.map(({ upgrade, ...tally }) => ({ key: upgrade.id, label: upgrade.name, tally }))}
            />
          ) : (
            <CardBody>
              <p className="text-sm text-fg-muted">
                Aún no se han anotado mejoras. Aparecerán aquí cuando se registren en los resultados.
              </p>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function StatsPage({ searchParams }: PageProps<"/estadisticas">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <StatsView searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
