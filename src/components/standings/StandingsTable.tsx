import type { SeasonStandings } from "@/lib/data/standings";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { CountryFlag } from "@/components/domain/CountryFlag";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { podiumChipClass, podiumRowClass } from "@/components/domain/podium";

type StandingsTableProps = {
  standings: SeasonStandings;
  /** Only the first N rows (e.g. home page); hides per-round columns */
  limit?: number;
  compact?: boolean;
};

// Vertical rules grouping the columns: points | gap, wins, podiums | rounds.
// The gap is hidden on phones, so there the rule moves to the wins column.
const headRule = "border-l border-bar-fg/20";
const cellRule = "border-l border-border";
// Number columns shrink to their content; the driver column takes the rest, and
// when it doesn't fit (phones) the table scrolls sideways
const tight = "w-px whitespace-nowrap";

/** Championship table: position, driver, points, gap, wins, podiums and each round. */
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
          <Th>{t.common.columns.driver}</Th>
          <Th align="right" className={tight}>
            {t.common.columns.points}
          </Th>
          <Th align="right" className={cn(tight, "max-sm:hidden", headRule)}>
            {t.common.columns.gap}
          </Th>
          {!compact && (
            <>
              <Th align="center" className={cn(tight, "max-sm:border-l max-sm:border-bar-fg/20")} title={t.common.columns.wins}>
                {t.common.columns.winsShort}
              </Th>
              <Th align="center" className={tight} title={t.common.columns.podiums}>
                {t.common.columns.podiumsShort}
              </Th>
              {races.map((race, i) => (
                <Th
                  key={race.id}
                  align="center"
                  className={cn(tight, i === 0 && headRule)}
                  title={`${t.common.round(race.round)} · ${race.track.name}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CountryFlag code={race.track.countryCode} className="h-3 w-[18px] shrink-0" />
                    {t.common.roundShort(race.round)}
                  </span>
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
              {/* Compact: the name takes only the width left over and truncates, so the table never scrolls */}
              <Td className={cn(compact ? "w-full max-w-0" : "whitespace-nowrap")}>
                <DriverName
                  name={driver?.name ?? "—"}
                  username={driver?.username}
                  color={driver?.favoriteColor?.hex}
                  className={cn(compact && "flex")}
                />
              </Td>
              <Td align="right" className="font-display text-lg font-bold italic">
                {row.points}
              </Td>
              <Td align="right" className={cn("text-fg-muted max-sm:hidden", cellRule)}>
                {row.gap === 0 ? "—" : `−${row.gap}`}
              </Td>
              {!compact && (
                <>
                  <Td align="center" className="max-sm:border-l max-sm:border-border">
                    {row.wins || <span className="text-fg-subtle">0</span>}
                  </Td>
                  <Td align="center">{row.podiums || <span className="text-fg-subtle">0</span>}</Td>
                  {races.map((race, i) => {
                    const raced = race.id in row.positions;
                    const position = row.positions[race.id];
                    return (
                      <Td key={race.id} align="center" className={cn(i === 0 && cellRule)}>
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
