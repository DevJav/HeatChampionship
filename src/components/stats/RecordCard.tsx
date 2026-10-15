import Link from "next/link";
import type { ChampionshipRecord } from "@/lib/stats";
import type { StatsDriver } from "@/lib/data/stats";
import { Badge, Card } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { t } from "@/i18n";

const MAX_HOLDERS = 3;

type RecordCardProps = {
  label: string;
  icon: React.ReactNode;
  record: ChampionshipRecord | null;
  drivers: Map<string, StatsDriver>;
  /** How to show the record value, e.g. (v) => `+${v}` */
  format?: (value: number) => string;
  /** Small print under the value, e.g. the minimum starts */
  caption?: string;
  /** Name the season in race links (all-time view) */
  showSeason?: boolean;
};

/** One championship record: the value and who holds it (all tied holders, up to three named). */
export function RecordCard({ label, icon, record, drivers, format = String, caption, showSeason }: RecordCardProps) {
  const holders = record?.holders ?? [];
  const extra = holders.length - MAX_HOLDERS;

  return (
    <Card className="gap-3 border-l-4 border-primary p-4">
      <div className="flex items-center justify-between gap-2 text-fg-muted">
        <span className="font-display text-xs font-bold uppercase tracking-wider">{label}</span>
        <span className="[&_svg]:size-4">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold italic leading-none">{record ? format(record.value) : "—"}</span>
        {caption && <span className="text-xs text-fg-subtle">{caption}</span>}
      </div>
      {holders.length > 0 && (
        <ul className="flex flex-col gap-2">
          {holders.slice(0, MAX_HOLDERS).map((holder, i) => {
            const driver = drivers.get(holder.userId);
            const race = holder.race;
            return (
              <li key={`${holder.userId}-${race?.id ?? i}`} className="flex items-center justify-between gap-2">
                <DriverName
                  name={driver?.name ?? "—"}
                  username={driver?.username}
                  color={driver?.favoriteColor?.hex}
                  detail={
                    race ? (
                      <>
                        <Link href={`/carreras/${race.id}`} className="hover:text-primary hover:underline">
                          {race.trackName} · {t.common.roundShort(race.round)}
                          {showSeason && ` · ${race.seasonName}`}
                        </Link>
                        {holder.detail && ` · ${holder.detail}`}
                      </>
                    ) : (
                      holder.detail
                    )
                  }
                />
                {holder.ongoing && <Badge tone="success">{t.stats.ongoing}</Badge>}
              </li>
            );
          })}
          {extra > 0 && <li className="text-xs text-fg-muted">{t.stats.andMore(extra)}</li>}
        </ul>
      )}
    </Card>
  );
}
