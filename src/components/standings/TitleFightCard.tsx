import { Swords } from "lucide-react";
import type { StatsDriver } from "@/lib/data/stats";
import { raceTitle } from "@/lib/races";
import type { TitleFight } from "@/lib/title-fight";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { t } from "@/i18n";

type NextRace = { round: number; track: { name: string } } | null;

/** Who can still win the season and what the leader needs next time out. */
export function TitleFightCard({ fight, drivers, total, nextRace }: { fight: TitleFight; drivers: Map<string, StatsDriver>; total: number; nextRace: NextRace }) {
  const name = (id: string) => drivers.get(id)?.name ?? "—";
  const leader = fight.contenders[0];
  const out = total - fight.contenders.length;
  const ordinal = fight.clinchPosition ? t.common.ordinal(fight.clinchPosition) : "";

  const headline = fight.decided
    ? t.titleFight.decided(name(leader.userId))
    : fight.clinchPosition
      ? nextRace
        ? t.titleFight.clinch(name(leader.userId), raceTitle(nextRace), fight.clinchPosition, ordinal)
        : t.titleFight.clinchNext(name(leader.userId), fight.clinchPosition, ordinal)
      : t.titleFight.notYet(name(leader.userId));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.titleFight.title}</CardTitle>
          <CardDescription>{t.titleFight.left(fight.remaining, fight.pointsLeft)}</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <p className="flex items-center gap-2 font-display text-lg font-bold italic">
          <Swords aria-hidden className="size-5 shrink-0 text-primary" />
          {headline}
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {fight.contenders.map((c) => {
            const driver = drivers.get(c.userId);
            return (
              <li key={c.userId} className="flex items-center gap-3 bg-surface-2 px-3 py-2">
                <DriverName name={driver?.name ?? "—"} username={driver?.username} color={driver?.favoriteColor?.hex} className="flex-1" />
                <span className="font-display font-bold italic tabular-nums">
                  {c.points} {t.common.pts}
                </span>
                <span className="w-16 text-right text-xs tabular-nums text-fg-muted">{c.gap > 0 ? `−${c.gap}` : ""}</span>
                <span className="w-16 text-right text-xs tabular-nums text-fg-subtle">{t.titleFight.max(c.maxPoints)}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-fg-subtle">
          {out > 0 && `${t.titleFight.out(out)} `}
          {t.titleFight.note}
        </p>
      </CardBody>
    </Card>
  );
}
