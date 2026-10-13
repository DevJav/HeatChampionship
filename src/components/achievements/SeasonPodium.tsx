import { Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { DriverName } from "@/components/domain/DriverName";

type PodiumDriver = { name: string; username: string | null; favoriteColor: { hex: string } | null };

type SeasonPodiumProps = {
  /** Top three rows: rank and points (ties share a rank) */
  places: { userId: string; rank: number; points: number }[];
  drivers: Map<string, PodiumDriver>;
};

const PLACE = {
  1: { label: "Campeón", icon: Trophy, medal: "bg-gold text-[#2a1f00]", ring: "border-gold" },
  2: { label: "Subcampeón", icon: Medal, medal: "bg-silver text-[#16181b]", ring: "border-silver" },
  3: { label: "Tercero", icon: Medal, medal: "bg-bronze text-[#1e1206]", ring: "border-bronze" },
} as const;

/** Final top three of a finished season, champion first and biggest. */
export function SeasonPodium({ places, drivers }: SeasonPodiumProps) {
  return (
    <ol className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
      {places
        .filter((p) => p.rank <= 3)
        .map((place) => {
          const style = PLACE[place.rank as 1 | 2 | 3];
          const driver = drivers.get(place.userId);
          const champion = place.rank === 1;
          return (
            <li
              key={place.userId}
              className={cn(
                "flex items-center gap-4 border-l-4 bg-surface p-4 surface-panel clip-chamfer",
                style.ring,
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)]",
                  style.medal,
                  champion ? "size-14" : "size-10",
                )}
              >
                <style.icon className={champion ? "size-7" : "size-5"} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-fg-muted">{style.label}</span>
                <DriverName name={driver?.name ?? "—"} username={driver?.username} color={driver?.favoriteColor?.hex} />
                <span className="font-display text-sm font-bold italic tabular-nums text-fg-muted">{place.points} pts</span>
              </span>
            </li>
          );
        })}
    </ol>
  );
}
