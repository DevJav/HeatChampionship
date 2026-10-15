import type { SeasonStandings } from "@/lib/data/standings";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { PositionsGained } from "@/components/domain/PositionsGained";
import { podiumChipClass, podiumRowClass } from "@/components/domain/podium";

type StandingsTableProps = {
  standings: SeasonStandings;
  /** Only the first N rows (e.g. home page); hides per-round columns */
  limit?: number;
  compact?: boolean;
};

/** Championship table: position, movement, driver, points, gap, wins, podiums and each round. */
export function StandingsTable({ standings, limit, compact = false }: StandingsTableProps) {
  const { rows, drivers, races } = standings;
  const shown = limit ? rows.slice(0, limit) : rows;

  return (
    <Table>
      <THead>
        <tr>
          <Th align="center" className="w-20">
            {t.common.columns.position}
          </Th>
          {!compact && <Th className="w-10 px-0" aria-label={t.common.columns.movement} />}
          <Th>{t.common.columns.driver}</Th>
          <Th align="right">{t.common.columns.points}</Th>
          <Th align="right" className="max-sm:hidden">
            {t.common.columns.gap}
          </Th>
          {!compact && (
            <>
              <Th align="center" title={t.common.columns.wins}>
                {t.common.columns.winsShort}
              </Th>
              <Th align="center" title={t.common.columns.podiums}>
                {t.common.columns.podiumsShort}
              </Th>
              {races.map((race) => (
                <Th key={race.id} align="center" className="max-lg:hidden" title={`${t.common.round(race.round)} · ${race.track.name}`}>
                  {t.common.roundShort(race.round)}
                </Th>
              ))}
            </>
          )}
        </tr>
      </THead>
      <TBody>
        {shown.map((row) => {
          const driver = drivers.get(row.userId);
          return (
            <Tr key={row.userId} className={podiumRowClass(row.rank)}>
              <Td align="center">
                <PositionBadge position={row.rank} size="sm" />
              </Td>
              {!compact && (
                <Td align="center" className="px-0">
                  {row.movement != null && row.movement !== 0 && <PositionsGained value={row.movement} />}
                </Td>
              )}
              <Td>
                <DriverName
                  name={driver?.name ?? "—"}
                  username={driver?.username}
                  color={driver?.favoriteColor?.hex}
                />
              </Td>
              <Td align="right" className="font-display text-lg font-bold italic">
                {row.points}
              </Td>
              <Td align="right" className="text-fg-muted max-sm:hidden">
                {row.gap === 0 ? "—" : `−${row.gap}`}
              </Td>
              {!compact && (
                <>
                  <Td align="center">{row.wins || <span className="text-fg-subtle">0</span>}</Td>
                  <Td align="center">{row.podiums || <span className="text-fg-subtle">0</span>}</Td>
                  {races.map((race) => {
                    const raced = race.id in row.positions;
                    const position = row.positions[race.id];
                    return (
                      <Td key={race.id} align="center" className="max-lg:hidden">
                        {!raced ? (
                          <span className="text-fg-subtle">·</span>
                        ) : (
                          <span
                            className={cn(
                              "font-semibold",
                              position <= 3 &&
                                "inline-block min-w-8 -skew-x-12 pl-1.5 pr-[calc(0.375rem+0.14em)] font-display text-sm font-bold italic",
                              podiumChipClass(position),
                            )}
                            title={`${row.pointsByRace[race.id]} ${t.common.pts}`}
                          >
                            {t.common.ordinal(position)}
                          </span>
                        )}
                      </Td>
                    );
                  })}
                </>
              )}
            </Tr>
          );
        })}
      </TBody>
    </Table>
  );
}
