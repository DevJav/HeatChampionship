import type { OracleRow } from "@/lib/predictions";
import type { StatsDriver } from "@/lib/data/stats";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { t } from "@/i18n";

/** The season's predictors, best first. */
export function OracleTable({ rows, users }: { rows: OracleRow[]; users: Map<string, StatsDriver> }) {
  return (
    <Table>
      <THead>
        <tr>
          <Th align="right">#</Th>
          <Th>{t.predictions.predictor}</Th>
          <Th align="right">{t.predictions.made}</Th>
          <Th align="right">{t.predictions.exact}</Th>
          <Th align="right">{t.predictions.points}</Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const user = users.get(row.userId);
          return (
            <Tr key={row.userId}>
              <Td align="right" className="tabular-nums text-fg-muted">
                {row.rank}
              </Td>
              <Td>
                <DriverName name={user?.name ?? "—"} username={user?.username} color={user?.favoriteColor?.hex} />
              </Td>
              <Td align="right">{row.predictions}</Td>
              <Td align="right">{row.exact}</Td>
              <Td align="right" className="font-bold">
                {row.points}
              </Td>
            </Tr>
          );
        })}
      </TBody>
    </Table>
  );
}
