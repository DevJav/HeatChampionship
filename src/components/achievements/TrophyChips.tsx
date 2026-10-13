import type { Unlock } from "@/lib/achievements";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import { cn } from "@/lib/cn";
import { tierClass } from "./AchievementBadge";
import { AchievementIcon } from "./AchievementIcon";

/** Season trophies as compact chips: "🏆 Campeón 2025/26". */
export function TrophyChips({ unlocks, className }: { unlocks: Unlock[]; className?: string }) {
  const trophies = unlocks.filter((u) => ACHIEVEMENT_BY_ID.get(u.achievementId)?.trophy);
  if (trophies.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Trofeos de temporada">
      {[...trophies].reverse().map((unlock) => {
        const achievement = ACHIEVEMENT_BY_ID.get(unlock.achievementId)!;
        return (
          <li
            key={`${unlock.achievementId}-${unlock.season?.id}`}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 font-display text-xs font-bold uppercase italic clip-slant",
              tierClass[achievement.tier],
            )}
          >
            <AchievementIcon id={achievement.id} className="size-3.5" />
            {achievement.name} · {unlock.season?.name.replace(/^Temporada\s+/i, "")}
          </li>
        );
      })}
    </ul>
  );
}
