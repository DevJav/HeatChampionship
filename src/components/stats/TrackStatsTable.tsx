import type { TrackStats } from "@/lib/stats";
import type { StatsDriver } from "@/lib/data/stats";
import { formatDecimal } from "@/lib/format";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { t } from "@/i18n";

type TrackStatsTableProps = { rows: TrackStats[]; drivers: Map<string, StatsDriver> };

/** Per track: races held, its kings (most wins) and the latest winner. */
export function TrackStatsTable({ rows, drivers }: TrackStatsTableProps) {
  const driverName = (userId: string) => {
    const driver = drivers.get(userId);
    return (
      <DriverName
        key={userId}
        name={driver?.name ?? "—"}
        username={driver?.username}
        color={driver?.favoriteColor?.hex}
      />
    );
  };

  return (
    <Table>
      <THead>
        <tr>
          <Th>{t.stats.columns.track}</Th>
          <Th align="center" title={t.stats.columns.races}>
            {t.stats.columns.racesShort}
          </Th>
          <Th>{t.stats.mostWins}</Th>
          <Th className="max-md:hidden">{t.stats.columns.lastWinner}</Th>
          <Th align="right" className="max-sm:hidden" title={t.stats.columns.averageField}>
            {t.stats.columns.field}
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((track) => (
          <Tr key={track.trackId}>
            <Td className="font-display text-base font-bold uppercase italic">{track.trackName}</Td>
            <Td align="center">{track.races}</Td>
            <Td>
              {track.topWinners ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {track.topWinners.userIds.map(driverName)}
                  <span className="text-xs text-fg-muted">
                    {t.common.wins(track.topWinners.wins)}
                  </span>
                </div>
              ) : (
                <span className="text-fg-subtle">—</span>
              )}
            </Td>
            <Td className="max-md:hidden">
              {track.lastWinnerId ? driverName(track.lastWinnerId) : <span className="text-fg-subtle">—</span>}
            </Td>
            <Td align="right" className="max-sm:hidden">
              {formatDecimal(track.averageField)}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
