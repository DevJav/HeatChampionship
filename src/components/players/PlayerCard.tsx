import Link from "next/link";
import { summarizePlayer, type PlayerResult } from "@/lib/player-stats";
import { Avatar, Card } from "@/components/ui";
import type { Unlock } from "@/lib/achievements";
import { TrophyChips } from "@/components/achievements/TrophyChips";
import { FormStrip } from "./FormStrip";
import { t } from "@/i18n";

type PlayerCardProps = {
  player: {
    name: string;
    username: string | null;
    image: string | null;
    favoriteColor: { hex: string } | null;
  };
  results: PlayerResult[];
  /** This player's achievement unlocks (season trophies are shown) */
  unlocks?: Unlock[];
};

/** Driver card for the players list: identity, career numbers and recent form. */
export function PlayerCard({ player, results, unlocks = [] }: PlayerCardProps) {
  const summary = summarizePlayer(results, 3);
  const stats = [
    { label: t.drivers.races, value: summary.starts },
    { label: t.drivers.wins, value: summary.wins },
    { label: t.drivers.podiums, value: summary.podiums },
    { label: t.drivers.points, value: summary.points },
  ];

  return (
    <Card className="transition-transform hover:-translate-y-0.5">
      <Link href={`/pilotos/${player.username}`} className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={player.name} src={player.image} color={player.favoriteColor?.hex} size="lg" />
          <div className="min-w-0">
            <h3 data-driver={player.username ?? undefined} className="truncate pr-1 text-2xl">
              {player.name}
            </h3>
            <p className="text-sm text-fg-muted">@{player.username}</p>
          </div>
        </div>
        <TrophyChips unlocks={unlocks} />
        <dl className="grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{stat.label}</dt>
              <dd className="font-display text-2xl font-bold italic">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-fg-subtle">{t.drivers.form}</span>
          <FormStrip form={summary.form} />
        </div>
      </Link>
    </Card>
  );
}
