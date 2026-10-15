import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartColumn, Flag, Flame, Gauge, Medal, Rocket, Star, Tornado, Trophy, TrendingUp, Users, Award } from "lucide-react";
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
import { PalmaresTable } from "@/components/achievements/PalmaresTable";
import { CarColorChip } from "@/components/domain/CarColorChip";
import { SeasonPicker } from "@/components/standings/SeasonPicker";
import { DriverStatsTable } from "@/components/stats/DriverStatsTable";
import { GridChart } from "@/components/stats/GridChart";
import { HeadToHeadMatrix } from "@/components/stats/HeadToHeadMatrix";
import { RecordCard } from "@/components/stats/RecordCard";
import { TallyTable } from "@/components/stats/TallyTable";
import { TrackStatsTable } from "@/components/stats/TrackStatsTable";
import { getAchievements } from "@/lib/data/achievements";
import { listSeasons } from "@/lib/data/catalog";
import { getStatsData } from "@/lib/data/stats";
import { formatDecimal } from "@/lib/format";
import { seasonPodiums } from "@/lib/achievements";
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
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.stats.title };

const ALL_SEASONS = t.stats.allSeasons;

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
        title={t.stats.title}
        description={t.stats.description}
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
          title={t.standings.noResults}
          description={t.stats.noResultsDescription}
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
  // Season podiums only make sense across seasons
  const { unlocks } = season ? { unlocks: [] } : await getAchievements();
  const hasPalmares = seasonPodiums(unlocks).length > 0;

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.stats.races} value={races.length} icon={<Flag />} />
        <StatCard label={t.stats.drivers} value={driverRows.length} icon={<Users />} />
        <StatCard label={t.stats.distinctWinners} value={winners.size} icon={<Trophy />} />
        <StatCard label={t.stats.driversPerRace} value={formatDecimal(averageField)} icon={<Gauge />} />
      </div>

      {hasPalmares && (
        <Card>
          <BlockHeader title={t.stats.honours} description={t.stats.honoursDescription} />
          <PalmaresTable unlocks={unlocks} drivers={drivers} />
        </Card>
      )}

      <Section title={t.stats.records}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RecordCard label={t.stats.mostWins} icon={<Trophy />} record={records.mostWins} {...recordProps} />
          <RecordCard label={t.stats.mostPodiums} icon={<Medal />} record={records.mostPodiums} {...recordProps} />
          <RecordCard label={t.stats.mostPoints} icon={<Star />} record={records.mostPoints} {...recordProps} />
          <RecordCard
            label={t.stats.winStreak}
            icon={<Flame />}
            record={records.winStreak}
            caption={t.stats.winStreakCaption}
            {...recordProps}
          />
          <RecordCard
            label={t.stats.podiumStreak}
            icon={<Award />}
            record={records.podiumStreak}
            caption={t.stats.podiumStreakCaption}
            {...recordProps}
          />
          <RecordCard
            label={t.stats.bestAverageFinish}
            icon={<Gauge />}
            record={records.bestAverageFinish}
            format={formatDecimal}
            caption={t.stats.minRaces(records.minStarts)}
            {...recordProps}
          />
          <RecordCard
            label={t.stats.biggestComeback}
            icon={<TrendingUp />}
            record={records.biggestComeback}
            format={(v) => `+${v}`}
            caption={t.stats.biggestComebackCaption}
            {...recordProps}
          />
          <RecordCard
            label={t.stats.winFromFurthestBack}
            icon={<Rocket />}
            record={records.winFromFurthestBack}
            format={t.common.ordinal}
            caption={t.stats.winFromFurthestBackCaption}
            {...recordProps}
          />
          <RecordCard label={t.stats.mostRaces} icon={<Flag />} record={records.mostStarts} {...recordProps} />
          <RecordCard label={t.stats.mostSpins} icon={<Tornado />} record={records.mostSpins} caption={t.stats.mostSpinsCaption} {...recordProps} />
        </div>
        <p className="text-xs text-fg-muted">{t.stats.streaksNote}</p>
      </Section>

      <Card>
        <BlockHeader title={t.stats.drivers} description={t.stats.driversDescription} />
        <DriverStatsTable rows={driverRows} drivers={drivers} />
      </Card>

      {driverRows.length >= 2 && (
        <Card>
          <BlockHeader
            title={t.stats.headToHead}
            description={t.stats.headToHeadDescription}
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
          <BlockHeader title={t.stats.grid} description={t.stats.gridDescription} />
          <CardBody className="flex flex-col gap-4">
            <GridChart slots={grid} />
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-fg-muted hover:text-primary">
                {t.stats.viewAsTable}
              </summary>
              <div className="mt-3">
                <TallyTable
                  labelHeader={t.stats.start}
                  usesHeader={t.stats.starts}
                  rows={grid.map((slot) => ({ key: slot.startPosition, label: t.common.ordinal(slot.startPosition), tally: slot }))}
                />
              </div>
            </details>
          </CardBody>
        </Card>
      )}

      <Card>
        <BlockHeader title={t.stats.tracks} />
        <TrackStatsTable rows={trackStats(races)} drivers={drivers} />
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <BlockHeader title={t.stats.cars} description={t.stats.carsDescription} />
          {colors.length > 0 ? (
            <TallyTable
              labelHeader={t.stats.color}
              rows={colors.map(({ color, ...tally }) => ({
                key: color.id,
                label: <CarColorChip name={color.name} hex={color.hex} />,
                tally,
              }))}
            />
          ) : (
            <CardBody>
              <p className="text-sm text-fg-muted">{t.stats.noColors}</p>
            </CardBody>
          )}
        </Card>

        <Card>
          <BlockHeader title={t.stats.upgrades} description={t.stats.upgradesDescription} />
          {upgrades.length > 0 ? (
            <TallyTable
              labelHeader={t.stats.upgrade}
              rows={upgrades.map(({ upgrade, ...tally }) => ({ key: upgrade.id, label: upgrade.name, tally }))}
            />
          ) : (
            <CardBody>
              <p className="text-sm text-fg-muted">
                {t.stats.noUpgrades}
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
