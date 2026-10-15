import Link from "next/link";
import { History } from "lucide-react";
import { formatDate } from "@/lib/format";
import { positionsGained } from "@/lib/scoring";
import { EmptyState, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { PositionsGained } from "@/components/domain/PositionsGained";
import { SpinCount } from "@/components/domain/SpinCount";
import { t } from "@/i18n";

type HistoryRow = {
  position: number;
  spins: number;
  startPosition: number | null;
  points: number;
  carColor: { name: string; hex: string } | null;
  race: { id: string; round: number; scheduledAt: Date; season: { name: string }; track: { name: string } };
};

/** A driver's finished races, newest first. */
export function RaceHistory({ results }: { results: HistoryRow[] }) {
  if (results.length === 0) {
    return <EmptyState icon={<History />} title={t.drivers.noHistory} className="m-5 py-8" />;
  }
  const showSpins = results.some((r) => r.spins > 0);
  return (
    <Table>
      <THead>
        <tr>
          <Th align="center" className="w-20">
            {t.common.columns.position}
          </Th>
          <Th>{t.drivers.race}</Th>
          <Th className="max-sm:hidden">{t.drivers.date}</Th>
          <Th align="center">{t.common.columns.start}</Th>
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
          <Tr key={result.race.id}>
            <Td align="center">
              <PositionBadge position={result.position} size="sm" />
            </Td>
            <Td>
              <Link href={`/carreras/${result.race.id}`} className="font-semibold hover:text-primary hover:underline">
                {result.race.track.name}
              </Link>
              <span className="block text-xs text-fg-muted">
                {t.common.round(result.race.round)} · {result.race.season.name}
              </span>
            </Td>
            <Td className="text-fg-muted max-sm:hidden">{formatDate(result.race.scheduledAt)}</Td>
            <Td align="center" className="whitespace-nowrap">
              {result.startPosition ? (
                <>
                  <span className="text-fg-muted">{t.common.ordinal(result.startPosition)}</span>{" "}
                  <PositionsGained value={positionsGained(result.startPosition, result.position)} />
                </>
              ) : (
                <span className="text-fg-subtle">—</span>
              )}
            </Td>
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
