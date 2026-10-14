import { cn } from "@/lib/cn";
import type { RaceResultDetail } from "@/lib/data/results";
import { Avatar } from "@/components/ui";
import { PositionBadge } from "@/components/domain/PositionBadge";

// Each step must fit its position tag (lg for the winner, md for the rest)
const steps = [
  { place: 2, height: "h-20 sm:h-24", badge: "md" },
  { place: 1, height: "h-28 sm:h-32", badge: "lg" },
  { place: 3, height: "h-16 sm:h-20", badge: "md" },
] as const;

/** Top three on a podium, winner in the middle. */
export function Podium({ results }: { results: RaceResultDetail[] }) {
  const byPlace = new Map(results.filter((r) => r.position != null).map((r) => [r.position!, r]));

  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {steps.map(({ place, height, badge }) => {
        const result = byPlace.get(place);
        return (
          <div key={place} className="flex min-w-0 flex-col items-center gap-2">
            {result && (
              <>
                <Avatar
                  name={result.user.name}
                  src={result.user.image}
                  color={result.carColor?.hex ?? result.user.favoriteColor?.hex}
                  size={place === 1 ? "xl" : "lg"}
                />
                <span
                  data-driver={result.user.username ?? undefined}
                  className="max-w-full pl-1 pr-[calc(0.25rem+0.14em)] text-center font-display text-lg leading-tight font-bold uppercase italic [overflow-wrap:anywhere]"
                >
                  {result.user.name}
                </span>
                <span className="text-sm text-fg-muted tabular-nums">{result.points} pts</span>
              </>
            )}
            <div className={cn("flex w-full items-start justify-center surface-bar pt-3", height)}>
              <PositionBadge position={place} size={badge} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
