import Link from "next/link";
import { Crown, Flag, Rocket, TrendingUp } from "lucide-react";
import type { StatsDriver } from "@/lib/data/stats";
import { formatDate, formatDecimal, formatNames, formatPercent } from "@/lib/format";
import { championshipRecords, gridStats, raceHistory, type entrantRecords, type StatsRace } from "@/lib/stats";
import { Card, CardDescription, CardHeader, CardTitle, StatCard, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { t } from "@/i18n";

/**
 * What has happened at one track, in pieces shared by the race page's track
 * preview and the track's own page. `races` are the finished races there
 * (getStatsData with the track's id).
 */

type NameOf = (userId: string) => string;

/** Races held, king of the track, pole win rate and biggest comeback; a "first visit" card without races. */
export function TrackStatCards({ races, nameOf }: { races: StatsRace[]; nameOf: NameOf }) {
  if (races.length === 0) {
    return (
      <Card className="border-l-4 border-primary p-5">
        <p className="font-display text-xl font-bold uppercase italic">{t.races.track.firstVisit}</p>
        <p className="text-sm text-fg-muted">{t.races.track.firstVisitBody}</p>
      </Card>
    );
  }

  const records = championshipRecords(races);
  const pole = gridStats(races)[0];
  const kings = records.mostWins;
  const comeback = records.biggestComeback?.holders[0];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label={t.races.track.racesHere}
        value={races.length}
        hint={t.races.track.lastRace(formatDate(races[races.length - 1].scheduledAt))}
        icon={<Flag />}
      />
      <StatCard
        label={t.races.track.king}
        value={!kings ? "—" : kings.holders.length === 1 ? nameOf(kings.holders[0].userId) : t.common.tie}
        hint={
          !kings
            ? t.races.track.nobodyWon
            : kings.holders.length === 1
              ? t.common.wins(kings.value)
              : t.races.track.winsEach(formatNames(kings.holders.map((h) => nameOf(h.userId))), t.common.wins(kings.value))
        }
        icon={<Crown />}
      />
      <StatCard
        label={t.races.track.poleWins}
        value={pole?.uses ? formatPercent(pole.winRate) : "—"}
        hint={pole?.uses ? t.races.track.poleHint(pole.wins, pole.uses) : t.races.track.noGrids}
        icon={<Rocket />}
      />
      <StatCard
        label={t.races.track.comeback}
        value={records.biggestComeback ? `+${records.biggestComeback.value}` : "—"}
        hint={comeback ? `${nameOf(comeback.userId)} · ${comeback.detail}` : t.races.track.noComeback}
        icon={<TrendingUp />}
      />
    </div>
  );
}

type TrackDriver = { name: string; username?: string | null; color?: string | null; detail?: string };

/** Each driver's record at the track, as sorted by entrantRecords (best average finish first). */
export function TrackDriversTable({
  title,
  description,
  rows,
  driverOf,
  className,
}: {
  title: string;
  description: string;
  rows: ReturnType<typeof entrantRecords>;
  driverOf: (userId: string) => TrackDriver;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <Th>{t.common.columns.driver}</Th>
            <Th align="center" title={t.races.track.racesAtTrack}>
              {t.races.track.racesShort}
            </Th>
            <Th align="center" title={t.common.columns.wins}>
              {t.common.columns.winsShort}
            </Th>
            <Th align="center" title={t.common.columns.podiums}>
              {t.common.columns.podiumsShort}
            </Th>
            <Th align="center" title={t.races.track.best}>
              {t.races.track.bestShort}
            </Th>
            <Th align="right" className="max-sm:hidden" title={t.races.track.average}>
              {t.races.track.averageShort}
            </Th>
            <Th align="center" className="max-sm:hidden" title={t.races.track.last}>
              {t.races.track.lastShort}
            </Th>
          </tr>
        </THead>
        <TBody>
          {rows.map(({ userId, stats }) => {
            const driver = driverOf(userId);
            return (
              <Tr key={userId}>
                <Td>
                  <DriverName name={driver.name} username={driver.username} color={driver.color} detail={driver.detail} />
                </Td>
                {stats ? (
                  <>
                    <Td align="center">{stats.starts}</Td>
                    <Td align="center">{stats.wins}</Td>
                    <Td align="center">{stats.podiums}</Td>
                    <Td align="center">
                      <PositionBadge position={stats.bestFinish!} size="sm" />
                    </Td>
                    <Td align="right" className="max-sm:hidden">
                      {stats.averageFinish == null ? "—" : formatDecimal(stats.averageFinish)}
                    </Td>
                    <Td align="center" className="max-sm:hidden">
                      <PositionBadge position={stats.form[0]} size="sm" />
                    </Td>
                  </>
                ) : (
                  <Td colSpan={6} className="text-fg-muted italic">
                    {t.races.track.debut}
                  </Td>
                )}
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </Card>
  );
}

/** Past races at the track, newest first, with the winner and the rest of the podium. */
export function TrackHistoryCard({
  races,
  drivers,
  nameOf,
  limit = Infinity,
  className,
}: {
  races: StatsRace[];
  drivers: Map<string, StatsDriver>;
  nameOf: NameOf;
  limit?: number;
  className?: string;
}) {
  const history = raceHistory(races);
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t.races.track.history}</CardTitle>
      </CardHeader>
      <ol className="flex flex-col divide-y divide-border/60">
        {history.slice(0, limit).map(({ race: past, scheduledAt, podium }) => (
          <li key={past.id} className="flex flex-col gap-1.5 px-5 py-3">
            <Link href={`/carreras/${past.id}`} className="text-xs text-fg-muted hover:text-primary hover:underline">
              {formatDate(scheduledAt)} · {past.seasonName} · {t.common.roundShort(past.round)}
            </Link>
            {podium[0] && (
              <div className="flex items-center gap-2.5">
                <PositionBadge position={1} size="sm" />
                <DriverName
                  name={nameOf(podium[0])}
                  username={drivers.get(podium[0])?.username}
                  color={drivers.get(podium[0])?.favoriteColor?.hex}
                />
              </div>
            )}
            {(podium[1] || podium[2]) && (
              <p className="text-xs text-fg-muted">
                {podium
                  .slice(1)
                  .map((userId, i) => userId && `${t.common.ordinal(i + 2)} ${nameOf(userId)}`)
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ol>
      {history.length > limit && (
        <p className="px-5 pb-3 text-xs text-fg-muted">{t.races.track.moreRaces(history.length - limit)}</p>
      )}
    </Card>
  );
}
