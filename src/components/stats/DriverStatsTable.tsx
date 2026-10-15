import type { DriverStats } from "@/lib/stats";
import type { StatsDriver } from "@/lib/data/stats";
import { formatDecimal, formatPercent } from "@/lib/format";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PositionsGained } from "@/components/domain/PositionsGained";
import { t } from "@/i18n";

const zero = <span className="text-fg-subtle">0</span>;

/** Career comparison: every driver's rates and averages, best points per race first. */
export function DriverStatsTable({ rows, drivers }: { rows: DriverStats[]; drivers: Map<string, StatsDriver> }) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>{t.common.columns.driver}</Th>
          <Th align="center" title={t.stats.columns.races}>
            {t.stats.columns.racesShort}
          </Th>
          <Th align="center" title={t.common.columns.wins}>
            {t.common.columns.winsShort}
          </Th>
          <Th align="center" title={t.common.columns.podiums}>
            {t.common.columns.podiumsShort}
          </Th>
          <Th align="right" className="max-sm:hidden" title={t.stats.columns.winRate}>
            {t.stats.columns.winRateShort}
          </Th>
          <Th align="right" className="max-md:hidden" title={t.stats.columns.average}>
            {t.stats.columns.averageShort}
          </Th>
          <Th align="center" className="max-md:hidden" title={t.stats.columns.gained}>
            +/−
          </Th>
          <Th align="center" className="max-lg:hidden" title={t.common.columns.spins}>
            {t.common.columns.spinsShort}
          </Th>
          <Th align="right" title={t.stats.columns.pointsPerRace}>
            {t.stats.columns.pointsPerRaceShort}
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const driver = drivers.get(row.userId);
          return (
            <Tr key={row.userId}>
              <Td>
                <DriverName name={driver?.name ?? "—"} username={driver?.username} color={driver?.favoriteColor?.hex} />
              </Td>
              <Td align="center">{row.starts}</Td>
              <Td align="center">{row.wins || zero}</Td>
              <Td align="center">{row.podiums || zero}</Td>
              <Td align="right" className="max-sm:hidden">
                {formatPercent(row.winRate)}
              </Td>
              <Td align="right" className="max-md:hidden">
                {row.averageFinish == null ? "—" : formatDecimal(row.averageFinish)}
              </Td>
              <Td align="center" className="max-md:hidden">
                <PositionsGained value={row.averageGained} />
              </Td>
              <Td align="center" className="max-lg:hidden">
                {row.spins || zero}
              </Td>
              <Td align="right" className="font-display text-lg font-bold italic">
                {formatDecimal(row.pointsPerRace)}
              </Td>
            </Tr>
          );
        })}
      </TBody>
    </Table>
  );
}
