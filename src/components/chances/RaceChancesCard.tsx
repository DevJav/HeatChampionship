import { raceChances } from "@/lib/chances";
import type { RaceDetail } from "@/lib/data/races";
import { getStatsData } from "@/lib/data/stats";
import { formatPercent } from "@/lib/format";
import { Badge, Card, CardHeader, CardTitle, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { t } from "@/i18n";

const percent = (p: number) => (p > 0 && p < 0.005 ? t.chances.tiny : formatPercent(p));

/** Chance of a win and of a podium for the confirmed drivers of an upcoming race. */
export async function RaceChancesCard({ race }: { race: RaceDetail }) {
  const entrants = race.registrations.filter((r) => r.status === "CONFIRMED").map((r) => r.user);
  if (entrants.length < 3) return null;
  const { races } = await getStatsData();
  const chances = raceChances(
    entrants.map((e) => e.id),
    races,
    race.track.id,
    race.id,
  );
  const byId = new Map(entrants.map((e) => [e.id, e]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.chances.title}</CardTitle>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <Th>{t.common.columns.driver}</Th>
            <Th align="right">{t.chances.win}</Th>
            <Th align="right">{t.chances.podium}</Th>
          </tr>
        </THead>
        <TBody>
          {chances.map((c, i) => {
            const driver = byId.get(c.userId)!;
            return (
              <Tr key={c.userId}>
                <Td>
                  <span className="flex items-center gap-2">
                    <DriverName name={driver.name} username={driver.username} color={driver.favoriteColor?.hex} />
                    {i === 0 && <Badge tone="accent">{t.chances.favourite}</Badge>}
                  </span>
                </Td>
                <Td align="right" className="font-display text-lg font-bold italic tabular-nums">
                  {percent(c.win)}
                </Td>
                <Td align="right" className="tabular-nums text-fg-muted">
                  {percent(c.podium)}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </Card>
  );
}
