import type { RaceResultDetail } from "@/lib/data/results";
import { positionsGained } from "@/lib/scoring";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { podiumRowClass } from "@/components/domain/podium";
import { PositionsGained } from "@/components/domain/PositionsGained";
import { SpinCount } from "@/components/domain/SpinCount";
import { t } from "@/i18n";

/** Timing-tower style classification of a race. The stripe by each name shows the car color. */
export function ResultsTable({ results }: { results: RaceResultDetail[] }) {
  const showGrid = results.some((r) => r.startPosition != null);
  const showUpgrades = results.some((r) => r.upgrades.length > 0);
  const showSpins = results.some((r) => r.spins > 0);

  return (
    <Table>
      <THead>
        <tr>
          <Th align="center" className="w-20">
            {t.common.columns.position}
          </Th>
          <Th>{t.common.columns.driver}</Th>
          {showGrid && <Th align="center">{t.common.columns.start}</Th>}
          {showUpgrades && <Th className="max-md:hidden">{t.common.columns.upgrades}</Th>}
          {showSpins && (
            <Th align="center" title={t.common.columns.spins}>
              {t.common.columns.spinsShort}
            </Th>
          )}
          <Th align="right">{t.common.columns.points}</Th>
        </tr>
      </THead>
      <TBody>
        {results.map((result) => (
          <Tr key={result.id} className={podiumRowClass(result.position)}>
            <Td align="center">
              <PositionBadge position={result.position} size="sm" />
            </Td>
            <Td>
              <DriverName
                name={result.user.name}
                username={result.user.username}
                color={result.carColor?.hex ?? result.user.favoriteColor?.hex}
                detail={result.notes}
              />
            </Td>
            {showGrid && (
              <Td align="center" className="whitespace-nowrap">
                <span className="text-fg-muted">{result.startPosition == null ? "—" : t.common.ordinal(result.startPosition)}</span>{" "}
                <PositionsGained value={positionsGained(result.startPosition, result.position)} />
              </Td>
            )}
            {showUpgrades && (
              <Td className="text-sm text-fg-muted max-md:hidden">{result.upgrades.map((u) => u.upgrade.name).join(", ") || "—"}</Td>
            )}
            {showSpins && (
              <Td align="center">
                <SpinCount spins={result.spins} />
              </Td>
            )}
            <Td align="right" className="font-display text-lg font-bold italic">
              {result.points}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
