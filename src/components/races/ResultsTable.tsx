import type { RaceResultDetail } from "@/lib/data/results";
import { positionsGained } from "@/lib/scoring";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { CarColorChip } from "@/components/domain/CarColorChip";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { PositionsGained } from "@/components/domain/PositionsGained";

/** Timing-tower style classification of a race. */
export function ResultsTable({ results }: { results: RaceResultDetail[] }) {
  const showGrid = results.some((r) => r.startPosition != null);
  const showCars = results.some((r) => r.carColor);
  const showUpgrades = results.some((r) => r.upgrades.length > 0);

  return (
    <Table>
      <THead>
        <tr>
          <Th align="center" className="w-20">
            Pos.
          </Th>
          <Th>Piloto</Th>
          {showGrid && <Th align="center">Salida</Th>}
          {/* On phones the stripe next to the name already shows the car color */}
          {showCars && <Th className="max-sm:hidden">Coche</Th>}
          {showUpgrades && <Th className="max-md:hidden">Mejoras</Th>}
          <Th align="right">Pts</Th>
        </tr>
      </THead>
      <TBody>
        {results.map((result) => (
          <Tr key={result.id}>
            <Td align="center">
              <PositionBadge position={result.position} size="sm" />
            </Td>
            <Td>
              <DriverName
                name={result.user.name}
                color={result.carColor?.hex ?? result.user.favoriteColor?.hex}
                detail={result.notes}
              />
            </Td>
            {showGrid && (
              <Td align="center" className="whitespace-nowrap">
                <span className="text-fg-muted">{result.startPosition ?? "—"}º</span>{" "}
                <PositionsGained value={positionsGained(result.startPosition, result.position)} />
              </Td>
            )}
            {showCars && <Td className="max-sm:hidden">{result.carColor ? <CarColorChip {...result.carColor} /> : "—"}</Td>}
            {showUpgrades && (
              <Td className="text-sm text-fg-muted max-md:hidden">{result.upgrades.map((u) => u.upgrade.name).join(", ") || "—"}</Td>
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
