import type { Tally } from "@/lib/stats";
import { formatDecimal, formatPercent } from "@/lib/format";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { t } from "@/i18n";

export type TallyRow = { key: string | number; label: React.ReactNode; tally: Tally };

type TallyTableProps = {
  /** Header of the first column, e.g. "Color" */
  labelHeader: string;
  /** Header of the usage column, e.g. uses or starts */
  usesHeader?: string;
  rows: TallyRow[];
};

/** Outcomes per car color, upgrade or grid slot: uses, wins, podiums, win rate, average finish. */
export function TallyTable({ labelHeader, usesHeader = t.stats.uses, rows }: TallyTableProps) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>{labelHeader}</Th>
          <Th align="center">{usesHeader}</Th>
          <Th align="center" title={t.common.columns.wins}>
            {t.common.columns.winsShort}
          </Th>
          <Th align="center" title={t.common.columns.podiums}>
            {t.common.columns.podiumsShort}
          </Th>
          <Th align="right" title={t.stats.columns.winRate}>
            {t.stats.columns.winRateShort}
          </Th>
          <Th align="right" className="max-sm:hidden" title={t.stats.columns.average}>
            {t.stats.columns.averageShort}
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map(({ key, label, tally }) => (
          <Tr key={key}>
            <Td>{label}</Td>
            <Td align="center">{tally.uses}</Td>
            <Td align="center">{tally.wins}</Td>
            <Td align="center">{tally.podiums}</Td>
            <Td align="right">{tally.uses ? formatPercent(tally.winRate) : "—"}</Td>
            <Td align="right" className="max-sm:hidden">
              {tally.averageFinish == null ? "—" : formatDecimal(tally.averageFinish)}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
