import Link from "next/link";
import { History } from "lucide-react";
import { formatDate } from "@/lib/format";
import { positionsGained } from "@/lib/scoring";
import { EmptyState, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { PositionsGained } from "@/components/domain/PositionsGained";

type HistoryRow = {
  position: number | null;
  startPosition: number | null;
  points: number;
  carColor: { name: string; hex: string } | null;
  race: { id: string; round: number; scheduledAt: Date; season: { name: string }; track: { name: string } };
};

/** A driver's finished races, newest first. */
export function RaceHistory({ results }: { results: HistoryRow[] }) {
  if (results.length === 0) {
    return <EmptyState icon={<History />} title="Todavía sin carreras" className="m-5 py-8" />;
  }
  return (
    <Table>
      <THead>
        <tr>
          <Th align="center" className="w-20">
            Pos.
          </Th>
          <Th>Carrera</Th>
          <Th className="max-sm:hidden">Fecha</Th>
          <Th align="center">Salida</Th>
          <Th align="right">Pts</Th>
        </tr>
      </THead>
      <TBody>
        {results.map((result) => (
          <Tr key={result.race.id}>
            <Td align="center">
              <PositionBadge position={result.position} size="sm" />
            </Td>
            <Td>
              <Link href={`/carreras/${result.race.id}`} className="font-semibold hover:text-primary hover:underline">
                {result.race.track.name}
              </Link>
              <span className="block text-xs text-fg-muted">
                Ronda {result.race.round} · {result.race.season.name}
              </span>
            </Td>
            <Td className="text-fg-muted max-sm:hidden">{formatDate(result.race.scheduledAt)}</Td>
            <Td align="center" className="whitespace-nowrap">
              {result.startPosition ? (
                <>
                  <span className="text-fg-muted">{result.startPosition}º</span>{" "}
                  <PositionsGained value={positionsGained(result.startPosition, result.position)} />
                </>
              ) : (
                <span className="text-fg-subtle">—</span>
              )}
            </Td>
            <Td align="right" className="font-display text-lg font-bold italic">
              {result.points}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
