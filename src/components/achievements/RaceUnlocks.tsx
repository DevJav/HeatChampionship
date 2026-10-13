import type { Unlock } from "@/lib/achievements";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import type { StatsDriver } from "@/lib/data/stats";
import { cn } from "@/lib/cn";
import { DriverName } from "@/components/domain/DriverName";
import { tierClass } from "./AchievementBadge";
import { AchievementIcon } from "./AchievementIcon";

const TIER_ORDER = ["gold", "silver", "bronze", "special", "common"];
const rank = (unlock: Unlock) => TIER_ORDER.indexOf(ACHIEVEMENT_BY_ID.get(unlock.achievementId)!.tier);

/** Achievements unlocked in one race: a row per driver, rarest first. */
export function RaceUnlocks({ unlocks, drivers }: { unlocks: Unlock[]; drivers: Map<string, StatsDriver> }) {
  const byDriver = new Map<string, Unlock[]>();
  for (const unlock of unlocks) byDriver.set(unlock.userId, [...(byDriver.get(unlock.userId) ?? []), unlock]);
  const rows = [...byDriver.entries()]
    .map(([userId, list]) => ({ userId, list: list.sort((a, b) => rank(a) - rank(b)) }))
    .sort((a, b) => rank(a.list[0]) - rank(b.list[0]));

  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {rows.map(({ userId, list }) => {
        const driver = drivers.get(userId);
        return (
          <li key={userId} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
            <DriverName
              name={driver?.name ?? "—"}
              username={driver?.username}
              color={driver?.favoriteColor?.hex}
              className="sm:w-40 sm:shrink-0"
            />
            <ul className="flex flex-wrap gap-2">
              {list.map((unlock) => {
                const achievement = ACHIEVEMENT_BY_ID.get(unlock.achievementId)!;
                return (
                  <li
                    key={unlock.achievementId}
                    title={achievement.description}
                    className="flex items-center gap-2 bg-surface-2 py-1 pr-3 pl-1 text-sm"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        tierClass[achievement.tier],
                      )}
                    >
                      <AchievementIcon id={achievement.id} className="size-3.5" />
                    </span>
                    <span className="font-display font-bold uppercase italic">{achievement.name}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
