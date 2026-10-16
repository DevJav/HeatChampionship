import type { RaceDetail } from "@/lib/data/races";
import { getStatsData } from "@/lib/data/stats";
import { formatOdds } from "@/lib/format";
import { raceOdds } from "@/lib/odds";
import { Badge, Card, CardBody, CardHeader, CardTitle, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { t } from "@/i18n";

/** Bookmaker-style odds for the confirmed drivers of an upcoming race. */
export async function RaceOddsCard({ race }: { race: RaceDetail }) {
  const entrants = race.registrations.filter((r) => r.status === "CONFIRMED").map((r) => r.user);
  if (entrants.length < 3) return null;
  const { races } = await getStatsData();
  const odds = raceOdds(
    entrants.map((e) => e.id),
    races,
    race.track.id,
    race.id,
  );
  const byId = new Map(entrants.map((e) => [e.id, e]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.odds.title}</CardTitle>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <Th>{t.common.columns.driver}</Th>
            <Th align="right">{t.odds.win}</Th>
            <Th align="right">{t.odds.podium}</Th>
          </tr>
        </THead>
        <TBody>
          {odds.map((o, i) => {
            const driver = byId.get(o.userId)!;
            return (
              <Tr key={o.userId}>
                <Td>
                  <span className="flex items-center gap-2">
                    <DriverName name={driver.name} username={driver.username} color={driver.favoriteColor?.hex} />
                    {i === 0 && <Badge tone="accent">{t.odds.favourite}</Badge>}
                  </span>
                </Td>
                <Td align="right" className="font-display text-lg font-bold italic tabular-nums" title={t.odds.chance(Math.round(o.win * 100))}>
                  {formatOdds(o.winOdds)}
                </Td>
                <Td align="right" className="tabular-nums text-fg-muted">
                  {formatOdds(o.podiumOdds)}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
      <CardBody className="py-3 text-xs text-fg-subtle">{t.odds.note}</CardBody>
    </Card>
  );
}
