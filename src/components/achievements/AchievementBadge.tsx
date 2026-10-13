import Link from "next/link";
import { Lock } from "lucide-react";
import type { AchievementTier, Award } from "@/lib/achievements";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { AchievementIcon } from "./AchievementIcon";

/** Medallion colors per tier (text color chosen for contrast on each fill) */
export const tierClass: Record<AchievementTier, string> = {
  gold: "bg-gold text-[#2a1f00]",
  silver: "bg-silver text-[#16181b]",
  bronze: "bg-bronze text-[#1e1206]",
  special: "bg-primary text-primary-fg",
  common: "surface-bar text-bar-fg",
};

/** Where an unlock happened, as a short link label */
function UnlockWhere({ unlock }: { unlock: Award["unlocks"][number] }) {
  if (unlock.race) {
    return (
      <Link href={`/carreras/${unlock.race.id}`} className="hover:text-primary hover:underline">
        {unlock.race.trackName} · R{unlock.race.round} · {unlock.race.seasonName}
      </Link>
    );
  }
  return unlock.season ? <>{unlock.season.name}</> : <>{formatDate(unlock.date)}</>;
}

/** One achievement: medallion, name and description; dimmed with a lock until earned. */
export function AchievementBadge({ award }: { award: Award }) {
  const { achievement, unlocks } = award;
  const earned = unlocks.length > 0;
  const last = unlocks[unlocks.length - 1];

  return (
    <li
      className={cn(
        "flex items-start gap-3 bg-surface p-3 clip-chamfer",
        earned ? "surface-panel" : "opacity-55 grayscale",
      )}
    >
      <span
        className={cn(
          "relative flex size-11 shrink-0 items-center justify-center rounded-full shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)]",
          earned ? tierClass[achievement.tier] : "bg-border text-fg-muted",
        )}
      >
        <AchievementIcon id={achievement.id} className="size-5" />
        {!earned && (
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-surface text-fg-muted ring-1 ring-border">
            <Lock className="size-3" />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold uppercase italic leading-tight">{achievement.name}</span>
          {unlocks.length > 1 && (
            <span className="font-display text-sm font-bold italic tabular-nums text-primary">×{unlocks.length}</span>
          )}
        </span>
        <span className="text-xs text-fg-muted">{achievement.description}</span>
        {last && (
          <span className="text-xs text-fg-subtle">
            {unlocks.length > 1 ? "Última: " : ""}
            <UnlockWhere unlock={last} />
          </span>
        )}
      </span>
    </li>
  );
}
